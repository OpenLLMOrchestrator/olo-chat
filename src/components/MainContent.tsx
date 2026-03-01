import { SECTIONS, type SectionId } from '../types/layout'
import { ChatView } from './ChatView'
import { RAGUploadView } from './RAGUploadView'
import type { Tenant } from '../types/tenant'
import { queueDisplayName } from '../lib/queueDisplayName'

export interface MainContentProps {
  sectionId: SectionId | null
  subId: string
  runSelected: boolean
  runId: string
  onRunIdChange: (id: string) => void
  tenantId?: string
  tenants?: Tenant[]
  tenantsLoading?: boolean
  configSelectedTenant?: Tenant | null
  onSelectTenant?: (tenant: Tenant) => void
  onAddNewTenant?: () => void
  onDeleteTenant?: (id: string) => void
  /** When this increments, ChatView starts a new chat (from Conversation panel button). */
  newChatTrigger?: number
}

export function MainContent({
  sectionId,
  subId,
  runSelected,
  runId,
  onRunIdChange,
  tenantId = '',
  tenants = [],
  tenantsLoading = false,
  configSelectedTenant = null,
  onSelectTenant,
  onAddNewTenant,
  onDeleteTenant,
  newChatTrigger = 0,
}: MainContentProps) {
  const section = sectionId ? SECTIONS.find((s) => s.id === sectionId) : null

  if (!section) {
    return (
      <main className="main-content">
        <div className="main-content-placeholder">
          <p>Select a category from the left panel.</p>
        </div>
      </main>
    )
  }

  if (sectionId === 'chat' || sectionId === 'rag') {
    const options = section.subOptions
    const resolvedLabel = options.find((o) => o.id === subId)?.label ?? (subId || section.label)
    const currentLabel = resolvedLabel?.includes(':') ? queueDisplayName(resolvedLabel) : resolvedLabel
    return (
      <main className="main-content main-content-chat">
        <div className="main-content-header">
          <h1 className="main-content-title">{section.label}</h1>
          <span className="main-content-subtitle">
            {' '}
            → {sectionId === 'chat' ? 'Conversation with Olo backend' : currentLabel}
          </span>
        </div>
        <div className="main-content-body main-content-body-chat">
          <ChatView tenantId={tenantId || undefined} taskQueue={subId || undefined} newChatTrigger={newChatTrigger} />
        </div>
      </main>
    )
  }

  const options = section.subOptions
  const resolvedLabel = options.find((o) => o.id === subId)?.label ?? (subId || section.label)
  const currentLabel = resolvedLabel?.includes(':') ? queueDisplayName(resolvedLabel) : resolvedLabel

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 className="main-content-title">
          {section.label}
          <span className="main-content-subtitle"> → {currentLabel}</span>
        </h1>
      </div>
      <div className="main-content-body">
        {sectionId === 'documents' ? (
          <RAGUploadView />
        ) : (
          <div className="main-content-placeholder-inner">
            <p>Select a category from the left panel.</p>
          </div>
        )}
      </div>
    </main>
  )
}
