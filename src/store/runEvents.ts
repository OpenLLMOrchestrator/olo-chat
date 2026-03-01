import { create } from 'zustand'
import type { RunEventDto } from '../api/chatApi'

export interface RunEventsState {
  runId: string | null
  events: RunEventDto[]
  setRun: (runId: string | null) => void
  addEvent: (event: RunEventDto) => void
  clear: () => void
}

export const runEventsStore = create<RunEventsState>((set) => ({
  runId: null,
  events: [],

  setRun: (runId) => set({ runId, events: [] }),

  addEvent: (event) =>
    set((s) => ({ events: [...s.events, event] })),

  clear: () => set({ runId: null, events: [] }),
}))
