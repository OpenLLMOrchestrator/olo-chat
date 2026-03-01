/**
 * Chat API for olo backend (sessions, messages, runs, SSE).
 * Uses VITE_API_BASE (e.g. http://localhost:7080) so requests go to BE port 7080; if unset, uses /api (Vite proxy to 7080).
 */

const API = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE.replace(/\/$/, '')}/api`
  : '/api'

export interface CreateSessionResponse {
  sessionId: string
}

export interface SendMessageResponse {
  messageId: string
  runId: string
}

export interface ChatMessageDto {
  messageId: string
  sessionId: string
  role: string
  content: string
  runId: string
  createdAt: number
}

export interface RunEventDto {
  eventVersion?: number
  runId: string
  nodeId: string
  parentNodeId: string | null
  nodeType: string
  status: string
  eventType?: string
  timestamp: number
  sequenceNumber?: number
  correlationId?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/** Tenant list from GET /api/tenants (olo backend). Populates the Chat UI top tenant dropdown. */
export interface TenantDto {
  id: string
  name: string
}

/** Fetches tenant list for the top dropdown. Uses GET /api/tenants (proxied to http://localhost:7080/api/tenants). */
export async function getTenants(): Promise<TenantDto[]> {
  try {
    const res = await fetch(`${API}/tenants`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** Kernel config queues from Redis keys <tenantId>:olo:kernel:config:* (for Chat and RAG). */
export async function getQueues(tenantId: string): Promise<string[]> {
  if (!tenantId) return []
  try {
    const res = await fetch(`${API}/tenants/${encodeURIComponent(tenantId)}/queues`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** Queue config from Redis key <tenantId>:olo:kernel:config:<queueName>. Used for pipeline dropdown in Conversation. */
export interface QueueConfigDto {
  pipelines?: Array<string | { id: string; name?: string }>
  [key: string]: unknown
}

export async function getQueueConfig(tenantId: string, queueName: string): Promise<QueueConfigDto> {
  if (!tenantId || !queueName) return {}
  try {
    const res = await fetch(
      `${API}/tenants/${encodeURIComponent(tenantId)}/queues/${encodeURIComponent(queueName)}/config`
    )
    if (!res.ok) return {}
    const data = await res.json()
    return data != null && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/** Health check for olo backend (plain "OK"). */
export async function getChatBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/health`)
    return res.ok
  } catch {
    return false
  }
}

export async function createSession(tenantId: string): Promise<CreateSessionResponse> {
  const res = await fetch(`${API}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  })
  if (!res.ok) throw new Error(`Create session failed: ${res.status}`)
  return res.json()
}

export async function sendMessage(
  sessionId: string,
  content: string,
  options?: { taskQueue?: string }
): Promise<SendMessageResponse> {
  const res = await fetch(`${API}/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, taskQueue: options?.taskQueue }),
  })
  if (!res.ok) throw new Error(`Send message failed: ${res.status}`)
  return res.json()
}

export async function listMessages(sessionId: string): Promise<ChatMessageDto[]> {
  const res = await fetch(`${API}/sessions/${encodeURIComponent(sessionId)}/messages`)
  if (!res.ok) throw new Error(`List messages failed: ${res.status}`)
  return res.json()
}

/**
 * Subscribe to run events via SSE. Calls onEvent for each event (catch-up then live).
 * Returns an abort function to close the stream.
 */
export function streamRunEvents(
  runId: string,
  onEvent: (event: RunEventDto) => void,
  onError?: (err: unknown) => void
): () => void {
  const ac = new AbortController()
  const url = `${API}/runs/${encodeURIComponent(runId)}/events`
  fetch(url, { signal: ac.signal, headers: { Accept: 'text/event-stream' } })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        onError?.(new Error(`SSE failed: ${res.status}`))
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const blocks = buf.split(/\n\n+/)
          buf = blocks.pop() ?? ''
          for (const block of blocks) {
            const line = block.split('\n').find((l) => l.startsWith('data: '))
            const dataLine = line?.slice(6)
            if (dataLine != null && dataLine !== '[DONE]') {
              try {
                const event = JSON.parse(dataLine) as RunEventDto
                onEvent(event)
              } catch {
                // skip malformed
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    })
    .catch((err) => {
      if (err?.name !== 'AbortError') onError?.(err)
    })
  return () => ac.abort()
}
