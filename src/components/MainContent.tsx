import { SECTIONS, type SectionId } from '../types/layout'
import { ChatView } from './ChatView'
import { QueuesList } from './QueuesList'
import type { Tenant } from '../types/tenant'

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

  if (sectionId === 'chat') {
    return (
      <main className="main-content main-content-chat">
        <div className="main-content-header">
          <h1 className="main-content-title">Chat</h1>
          <span className="main-content-subtitle"> → Conversation with Olo backend</span>
        </div>
        <div className="main-content-body main-content-body-chat">
          <QueuesList tenantId={tenantId || 'default'} className="main-content-queues" />
          <ChatView tenantId={tenantId || undefined} />
        </div>
      </main>
    )
  }

  const options = section.subOptions
  const currentLabel = options.find((o) => o.id === subId)?.label ?? (subId || section.label)

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 className="main-content-title">
          {section.label}
          <span className="main-content-subtitle"> → {currentLabel}</span>
        </h1>
      </div>
      <div className="main-content-body">
        {sectionId === 'rag' && (
          <QueuesList tenantId={tenantId || 'default'} className="main-content-queues" />
        )}
        <div className="main-content-placeholder-inner">
          {sectionId === 'rag' && (
            <>RAG: <strong>{currentLabel}</strong> — configuration and status (placeholder).</>
          )}
          {sectionId === 'documents' && (
            <>Documents: <strong>{currentLabel}</strong> — document library (placeholder).</>
          )}
        </div>
      </div>
    </main>
  )
}
