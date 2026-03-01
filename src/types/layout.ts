/**
 * Menu: Chat, RAG, Documents.
 * Section IDs are stable for URLs; labels are display-only.
 */
export type SectionId =
  | 'chat'
  | 'rag'
  | 'documents'

export interface SubOption {
  id: string
  label: string
  description?: string
  featureId?: keyof typeof import('../config/features').features
  toolIds?: string[]
}

export interface SectionConfig {
  id: SectionId
  label: string
  subtitle: string
  subOptions: SubOption[]
  runSelectedOptions?: SubOption[]
}

export const SECTIONS: SectionConfig[] = [
  {
    id: 'chat',
    label: 'Chat',
    subtitle: 'Conversation with Olo',
    subOptions: [
      { id: 'conversation', label: 'Conversation', description: 'Send messages and view run events' },
    ],
  },
  {
    id: 'rag',
    label: 'RAG',
    subtitle: 'Retrieval-augmented generation',
    subOptions: [
      { id: 'overview', label: 'Overview', description: 'RAG configuration and status' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    subtitle: 'Document management',
    subOptions: [
      { id: 'rag-upload', label: 'RAG upload', description: 'Upload documents with an existing or new RAG token' },
    ],
  },
]
