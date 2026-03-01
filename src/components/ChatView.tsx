import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createSession,
  getChatBackendHealth,
  listMessages,
  sendMessage,
  streamRunEvents,
  type ChatMessageDto,
  type RunEventDto,
} from '../api/chatApi'
import { runEventsStore } from '../store/runEvents'

/** Default tenant from backend (OLO_TENANT_IDS=default, olo:tenants). */
const DEFAULT_TENANT_ID = 'default'

export interface ChatViewProps {
  tenantId?: string
}

export function ChatView({ tenantId: tenantIdProp }: ChatViewProps) {
  const tenantId = tenantIdProp || DEFAULT_TENANT_ID
  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [runEvents, setRunEvents] = useState<RunEventDto[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unsubscribeRunRef = useRef<(() => void) | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    getChatBackendHealth().then(setConnected)
  }, [])

  useEffect(() => {
    if (!connected || sessionId) return
    createSession(tenantId)
      .then((r) => setSessionId(r.sessionId))
      .catch((e) => setError(String(e.message)))
  }, [connected, tenantId, sessionId])

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    listMessages(sessionId)
      .then(setMessages)
      .catch((e) => setError(String(e.message)))
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, runEvents, scrollToBottom])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || !sessionId || sending) return
    setInput('')
    setSending(true)
    setError(null)
    setRunEvents([])
    runEventsStore.getState().clear()
    sendMessage(sessionId, text)
      .then(({ runId }) => {
        setActiveRunId(runId)
        runEventsStore.getState().setRun(runId)
        listMessages(sessionId).then(setMessages).catch(() => {})
        unsubscribeRunRef.current?.()
        unsubscribeRunRef.current = streamRunEvents(
          runId,
          (ev) => {
            setRunEvents((prev) => [...prev, ev])
            runEventsStore.getState().addEvent(ev)
          },
          (err) => setError(String(err))
        )
      })
      .catch((e) => setError(String(e.message)))
      .finally(() => setSending(false))
  }, [input, sessionId, sending])

  useEffect(() => {
    return () => {
      unsubscribeRunRef.current?.()
    }
  }, [])

  const lastModelOutput = runEvents
    .filter((e) => e.nodeType === 'MODEL' && e.status === 'COMPLETED' && e.output)
    .pop()
  const assistantText = lastModelOutput?.output?.content ?? lastModelOutput?.output?.text ?? (lastModelOutput?.output ? String((lastModelOutput.output as Record<string, unknown>).content ?? (lastModelOutput.output as Record<string, unknown>).text ?? JSON.stringify(lastModelOutput.output)) : null)

  if (!connected) {
    return (
      <div className="chat-view chat-view-disconnected">
        <p>Connecting to Olo backend…</p>
        <p className="chat-view-hint">Start the olo backend (port 7080) and refresh.</p>
      </div>
    )
  }

  return (
    <div className="chat-view">
      <div className="chat-view-messages">
        {loading && messages.length === 0 ? (
          <div className="chat-view-placeholder">Loading conversation…</div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.messageId} className={`chat-view-message chat-view-message-${m.role}`}>
                <span className="chat-view-message-role">{m.role}</span>
                <div className="chat-view-message-content">{m.content}</div>
              </div>
            ))}
            {runEvents.length > 0 && (
              <div className="chat-view-events">
                <div className="chat-view-events-label">Run events</div>
                {runEvents.map((e, i) => (
                  <div key={i} className={`chat-view-event chat-view-event-${e.nodeType?.toLowerCase()}`}>
                    <span className="chat-view-event-type">{e.nodeType}</span>
                    <span className="chat-view-event-status">{e.status}</span>
                    {e.nodeId && <span className="chat-view-event-node">{e.nodeId}</span>}
                  </div>
                ))}
              </div>
            )}
            {assistantText && (
              <div className="chat-view-message chat-view-message-assistant">
                <span className="chat-view-message-role">assistant</span>
                <div className="chat-view-message-content">{assistantText}</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      {error && (
        <div className="chat-view-error" role="alert">
          {error}
        </div>
      )}
      <form
        className="chat-view-input-bar"
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <input
          className="chat-view-input"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || !sessionId}
          aria-label="Message"
        />
        <button type="submit" className="chat-view-send" disabled={sending || !sessionId || !input.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
