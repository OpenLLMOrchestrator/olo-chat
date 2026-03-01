import { create } from 'zustand'

/** Selected pipeline in the Conversation panel (within the current queue). Used to scope session list and new sessions per queue+pipeline. */
export interface ConversationPanelState {
  selectedPipelineId: string
  setSelectedPipelineId: (id: string) => void
}

export const conversationPanelStore = create<ConversationPanelState>((set) => ({
  selectedPipelineId: '',
  setSelectedPipelineId: (selectedPipelineId) => set({ selectedPipelineId }),
}))
