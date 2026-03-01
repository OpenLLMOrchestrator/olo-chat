/**
 * Contextual tools panel: tools for the current view (section + sub-option).
 * Queue vs pipeline: the left bar shows workflow queues (queue names). When a queue is selected,
 * this panel shows pipelines — the classification within that queue, from the queue's config,
 * used by workflow execution. Pipeline dropdown is populated from GET .../queues/{queueName}/config.
 */

import { useEffect, useState } from 'react'
import type { SectionId } from '../types/layout'
import { getToolsForView, getToolComponent, type ToolContext } from '../config/toolRegistry'
import { getQueueConfig, deleteAllSessions, deleteSession, listSessions, type QueueConfigDto } from '../api/chatApi'
import { chatSessionsStore } from '../store/chatSessions'
import { conversationPanelStore } from '../store/conversationPanel'
import { runEventsStore } from '../store/runEvents'
import { queueDisplayName } from '../lib/queueDisplayName'

export interface ToolsPanelProps {
  expanded: boolean
  onToggle: () => void
  sectionId: SectionId | null
  subId: string
  runSelected: boolean
  tenantId?: string
  /** Owning-store slice for the current section. Tools use this only. */
  storeContext?: Record<string, unknown>
  /** Called when user clicks "New chat" in Conversation (chat section only). */
  onNewChat?: () => void
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

function formatSessionLabel(createdAt: number): string {
  const d = new Date(createdAt)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ToolsPanel({
  expanded,
  onToggle,
  sectionId,
  subId,
  runSelected,
  tenantId = '',
  storeContext = {},
  onNewChat,
}: ToolsPanelProps) {
  const [pipelines, setPipelines] = useState<{ id: string; label: string }[]>([])
  const [pipelinesLoading, setPipelinesLoading] = useState(false)
  const selectedPipelineId = conversationPanelStore((s) => s.selectedPipelineId)
  const setSelectedPipelineId = conversationPanelStore((s) => s.setSelectedPipelineId)
  const [deletingAll, setDeletingAll] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const isQueueView = (sectionId === 'chat' || sectionId === 'rag') && !!subId
  const effectiveTenantId = tenantId || 'default'
  const sessions = chatSessionsStore((s) => s.sessions)
  const selectedSessionId = chatSessionsStore((s) => s.selectedSessionId)
  const setSessions = chatSessionsStore((s) => s.setSessions)
  const setSelectedSessionId = chatSessionsStore((s) => s.setSelectedSessionId)

  useEffect(() => {
    if (!isQueueView || !effectiveTenantId) {
      setPipelines([])
      conversationPanelStore.getState().setSelectedPipelineId('')
      return
    }
    setPipelinesLoading(true)
    getQueueConfig(effectiveTenantId, subId)
      .then((config) => {
        const list = pipelinesFromConfig(config)
        setPipelines(list)
        const prev = conversationPanelStore.getState().selectedPipelineId
        conversationPanelStore.getState().setSelectedPipelineId(list.some((p) => p.id === prev) ? prev : list[0]?.id ?? '')
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
              <label className="conversation-pipeline-label" title="Classification within the selected workflow queue">
                Pipeline
              </label>
              {pipelinesLoading ? (
                <span className="conversation-pipeline-loading">Loading…</span>
              ) : pipelines.length === 0 ? (
                <span className="conversation-pipeline-empty">No pipelines</span>
              ) : (
                <select
                  className="conversation-pipeline-select"
                  value={selectedPipelineId}
                  onChange={(e) => setSelectedPipelineId(e.target.value)}
                  aria-label="Select pipeline (within queue)"
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
          {sectionId === 'chat' && isQueueView && (
            <>
              <div className="conversation-new-chat-wrap">
                <button
                  type="button"
                  className="conversation-new-chat"
                  onClick={() => onNewChat?.()}
                  aria-label="Start a new chat"
                >
                  New chat
                </button>
              </div>
              <div className="conversation-sessions-block">
                <ul className="conversation-sessions-list" role="list">
                  {sessions.map((s) => (
                    <li key={s.sessionId} className="conversation-session-item">
                      <button
                        type="button"
                        className={`conversation-session-btn ${s.sessionId === selectedSessionId ? 'active' : ''}`}
                        onClick={() => setSelectedSessionId(s.sessionId)}
                      >
                        {formatSessionLabel(s.createdAt)}
                      </button>
                      <button
                        type="button"
                        className="conversation-session-delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (deletingSessionId || deletingAll) return
                          setDeletingSessionId(s.sessionId)
                          deleteSession(s.sessionId)
                            .then(() => {
                              const wasSelected = s.sessionId === selectedSessionId
                              return listSessions(effectiveTenantId, {
                                queue: queueDisplayName(subId),
                                pipeline: selectedPipelineId || undefined,
                              }).then((next) => {
                                setSessions(next)
                                if (wasSelected) {
                                  setSelectedSessionId(next[0]?.sessionId ?? null)
                                  runEventsStore.getState().clear()
                                }
                              })
                            })
                            .finally(() => setDeletingSessionId(null))
                        }}
                        disabled={deletingAll}
                        aria-label={`Delete conversation ${formatSessionLabel(s.createdAt)}`}
                        title="Delete conversation"
                      >
                        {deletingSessionId === s.sessionId ? '…' : '×'}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="conversation-delete-all-wrap">
                  <button
                    type="button"
                    className="conversation-delete-all"
                    onClick={() => {
                      if (!effectiveTenantId || deletingAll) return
                      setDeletingAll(true)
                      deleteAllSessions(effectiveTenantId, {
                          queue: queueDisplayName(subId),
                          pipeline: selectedPipelineId || undefined,
                        })
                        .then(() => {
                          setSessions([])
                          setSelectedSessionId(null)
                          runEventsStore.getState().clear()
                        })
                        .finally(() => setDeletingAll(false))
                    }}
                    disabled={sessions.length === 0 || deletingAll}
                    aria-label="Delete all conversations"
                  >
                    {deletingAll ? '…' : 'Delete all'}
                  </button>
                </div>
              </div>
            </>
          )}
          {tools.length > 0 && (
            <ul className="tools-list">
              {tools.map((t) => {
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
              })}
            </ul>
          )}
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
