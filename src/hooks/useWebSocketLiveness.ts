import { useEffect, useRef } from 'react'
import { getWebSocketUrl } from '../lib/wsUrl'
import { runEventsStore } from '../store/runEvents'
import type { RunEventDto } from '../api/chatApi'

const PING_INTERVAL_MS = 10_000

function makeLivenessEvent(status: 'ping' | 'pong', sequenceNumber: number): RunEventDto {
  return {
    runId: '__liveness__',
    nodeId: 'liveness',
    parentNodeId: null,
    nodeType: 'liveness',
    status,
    timestamp: Date.now(),
    sequenceNumber,
    metadata: { direction: status === 'ping' ? 'sent' : 'received' },
  }
}

/**
 * Connects to backend WebSocket, sends PING every 10s, and pushes ping/pong events to runEventsStore
 * so they appear in the Events panel and the bell turns green.
 */
export function useWebSocketLiveness() {
  const seqRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const url = getWebSocketUrl()
    if (!url) return

    const connect = () => {
      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          const sendPing = () => {
            if (ws.readyState !== WebSocket.OPEN) return
            seqRef.current += 1
            const seq = seqRef.current
            runEventsStore.getState().addEvent(makeLivenessEvent('ping', seq))
            ws.send(JSON.stringify({ type: 'PING' }))
          }
          sendPing()
          intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data?.type === 'PONG') {
              seqRef.current += 1
              runEventsStore.getState().addEvent(makeLivenessEvent('pong', seqRef.current))
            }
          } catch {
            // ignore non-JSON or parse errors
          }
        }

        ws.onclose = () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          wsRef.current = null
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch {
        // connection failed, no-op
      }
    }

    connect()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])
}
