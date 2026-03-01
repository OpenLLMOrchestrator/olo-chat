import { useState, useRef, useEffect } from 'react'
import { runEventsStore } from '../store/runEvents'

export function EventsList() {
  const { runId, events } = runEventsStore()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const listEndRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    listEndRef.current?.scrollTo?.({ top: listEndRef.current.scrollHeight, behavior: 'smooth' })
  }, [events.length])

  if (events.length === 0) {
    return (
      <div className="events-list">
        <div className="events-list-header">Run events</div>
        <div className="events-list-empty">
          {runId ? 'Waiting for events…' : 'Send a message in Chat to see run events here.'}
        </div>
      </div>
    )
  }

  return (
    <div className="events-list">
      <div className="events-list-header">
        Run events {runId && <span className="events-list-run-id">{runId.slice(0, 8)}…</span>}
      </div>
      <ul className="events-list-ul" ref={listEndRef}>
        {events.map((ev, i) => {
          const isExpanded = expandedId === i
          return (
            <li key={i} className={`events-list-item events-list-item-${(ev.nodeType ?? '').toLowerCase()}`}>
              <button
                type="button"
                className="events-list-item-head"
                onClick={() => setExpandedId(isExpanded ? null : i)}
                aria-expanded={isExpanded}
              >
                <span className="events-list-item-seq">#{ev.sequenceNumber ?? i}</span>
                <span className="events-list-item-type">{ev.nodeType ?? '—'}</span>
                <span className="events-list-item-status">{ev.status ?? '—'}</span>
                <span className="events-list-item-node">{ev.nodeId ?? ''}</span>
              </button>
              {isExpanded && (
                <div className="events-list-item-body">
                  {ev.timestamp != null && (
                    <div className="events-list-item-meta">
                      <span>Timestamp: {new Date(ev.timestamp).toISOString()}</span>
                    </div>
                  )}
                  {ev.input != null && Object.keys(ev.input).length > 0 && (
                    <div className="events-list-item-block">
                      <div className="events-list-item-label">Input</div>
                      <pre className="events-list-item-json">{JSON.stringify(ev.input, null, 2)}</pre>
                    </div>
                  )}
                  {ev.output != null && Object.keys(ev.output).length > 0 && (
                    <div className="events-list-item-block">
                      <div className="events-list-item-label">Output</div>
                      <pre className="events-list-item-json">{JSON.stringify(ev.output, null, 2)}</pre>
                    </div>
                  )}
                  {ev.metadata != null && Object.keys(ev.metadata).length > 0 && (
                    <div className="events-list-item-block">
                      <div className="events-list-item-label">Metadata</div>
                      <pre className="events-list-item-json">{JSON.stringify(ev.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
