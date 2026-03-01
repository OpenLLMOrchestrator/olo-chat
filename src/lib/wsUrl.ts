/**
 * WebSocket URL for the olo backend (/ws). Uses VITE_API_BASE (e.g. http://localhost:7080) → ws://localhost:7080/ws
 */
export function getWebSocketUrl(): string | null {
  const base = import.meta.env.VITE_API_BASE
  if (!base || typeof base !== 'string') return null
  const wsBase = base.trim().replace(/^http/, 'ws').replace(/\/$/, '')
  return `${wsBase}/ws`
}
