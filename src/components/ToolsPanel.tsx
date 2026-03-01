/**
 * Contextual tools panel: shows tools for the current view (section + sub-option).
 * When a queue is selected (Chat/RAG), shows pipeline dropdown from queue config.
 */

import { useEffect, useState } from 'react'
import type { SectionId } from '../types/layout'
import { getToolsForView, getToolComponent, type ToolContext } from '../config/toolRegistry'
import { getQueueConfig, type QueueConfigDto } from '../api/chatApi'

export interface ToolsPanelProps {
  expanded: boolean
  onToggle: () => void
  sectionId: SectionId | null
  subId: string
  runSelected: boolean
  tenantId?: string
  /** Owning-store slice for the current section. Tools use this only. */
  storeContext?: Record<string, unknown>
}

function pipelinesFromConfig(config: QueueConfigDto): { id: string; label: string }[] {
  const raw = config?.pipelines
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw.map((p) => {
    if (typeof p === 'string') return { id: p, label: p }
    if (p != null && typeof p === 'object' && 'id' in p)
      return { id: String((p as { id: string }).id), label: String((p as { name?: string }).name ?? (p as { id: string }).id) }
    return { id: '', label: '' }
  }).filter((p) => p.id)
}

export function ToolsPanel({
  expanded,
  onToggle,
  sectionId,
  subId,
  runSelected,
  tenantId = '',
  storeContext = {},
}: ToolsPanelProps) {
  const [pipelines, setPipelines] = useState<{ id: string; label: string }[]>([])
  const [pipelinesLoading, setPipelinesLoading] = useState(false)
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const isQueueView = (sectionId === 'chat' || sectionId === 'rag') && !!subId
  const effectiveTenantId = tenantId || 'default'

  useEffect(() => {
    if (!isQueueView || !effectiveTenantId) {
      setPipelines([])
      setSelectedPipelineId('')
      return
    }
    setPipelinesLoading(true)
    getQueueConfig(effectiveTenantId, subId)
      .then((config) => {
        const list = pipelinesFromConfig(config)
        setPipelines(list)
        setSelectedPipelineId((prev) => (list.some((p) => p.id === prev) ? prev : list[0]?.id ?? ''))
      })
      .catch(() => setPipelines([]))
      .finally(() => setPipelinesLoading(false))
  }, [isQueueView, effectiveTenantId, subId])

  const tools = getToolsForView(sectionId, subId, runSelected)
  const context: ToolContext = {
    sectionId,
    subId,
    runSelected,
    storeContext,
  }

  return (
    <aside className={`tools-panel side-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      {expanded && (
        <div className="side-panel-inner">
          <div className="side-panel-title">Conversation</div>
          {isQueueView && (
            <div className="conversation-pipeline-dropdown">
              <label className="conversation-pipeline-label">Pipeline</label>
              {pipelinesLoading ? (
                <span className="conversation-pipeline-loading">Loading…</span>
              ) : pipelines.length === 0 ? (
                <span className="conversation-pipeline-empty">No pipelines</span>
              ) : (
                <select
                  className="conversation-pipeline-select"
                  value={selectedPipelineId}
                  onChange={(e) => setSelectedPipelineId(e.target.value)}
                  aria-label="Select pipeline"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <ul className="tools-list">
            {tools.length === 0 ? (
              <li className="tools-list-item tools-list-empty">No tools for this view</li>
            ) : (
              tools.map((t) => {
                const ToolComponent = getToolComponent(t.id)
                return (
                  <li key={t.id} className="tools-list-item">
                    {ToolComponent ? (
                      <ToolComponent context={context} />
                    ) : (
                      <>
                        <span className="tools-list-label">{t.label}</span>
                        {t.description && <span className="tools-list-desc">{t.description}</span>}
                      </>
                    )}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
      <button
        type="button"
        className="side-panel-toggle"
        onClick={onToggle}
        title={expanded ? 'Collapse' : 'Expand'}
        aria-label={expanded ? 'Collapse tools' : 'Expand tools'}
      >
        {expanded ? (
          '<'
        ) : (
          <span className="side-panel-collapsed-label">Conversation</span>
        )}
      </button>
    </aside>
  )
}
