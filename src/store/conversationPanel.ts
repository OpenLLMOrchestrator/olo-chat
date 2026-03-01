import { create } from 'zustand'

/** Selected pipeline in the Conversation panel (within the current queue). Used to scope session list and new sessions per queue+pipeline. */
export interface ConversationPanelState {
  selectedPipelineId: string
  setSelectedPipelineId: (id: string) => void
  /** Selected RAG in the Conversation panel (RAG section only). Listed between Pipeline and New chat. */
  selectedRagId: string
  setSelectedRagId: (id: string) => void
}

export const conversationPanelStore = create<ConversationPanelState>((set) => ({
  selectedPipelineId: '',
  setSelectedPipelineId: (selectedPipelineId) => set({ selectedPipelineId }),
  selectedRagId: '',
  setSelectedRagId: (selectedRagId) => set({ selectedRagId }),
}))
