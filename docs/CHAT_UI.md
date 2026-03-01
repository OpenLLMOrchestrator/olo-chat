# Chat UI

This document describes the **Chat** section of olo-chat: behavior, APIs used, and how it aligns with the olo backend.

---

## Purpose

The Chat UI lets users:

1. Start a conversation (session) with the Olo backend.
2. Send messages and trigger runs (one run per user message).
3. See execution progress in real time (PLANNER, MODEL, TOOL, HUMAN, SYSTEM events) via SSE.
4. See the assistant’s final (or streaming) response when the MODEL node completes.

The backend (olo) is the single source of truth for sessions, messages, runs, and the execution event stream. See [olo/docs/ARCHITECTURE.md](../olo/docs/ARCHITECTURE.md) and [olo/docs/DESIGN.md](../olo/docs/DESIGN.md).

---

## APIs used

| Action            | API | Notes |
|-------------------|-----|--------|
| Health            | `GET /api/health` | Used to decide if the app can load (backend ready). |
| List tenants      | `GET /api/tenants` | Populates top dropdown; returns default tenant (from backend config) and optionally Redis-discovered tenant ids. |
| List queues       | `GET /api/tenants/{tenantId}/queues` | Queue names for selected tenant (Redis keys `<tenantId>:olo:kernel:config:*`); shown under Chat and RAG. |
| Queue config      | `GET /api/tenants/{tenantId}/queues/{queueName}/config` | Queue config JSON (e.g. `pipelines` array) for the Conversation pipeline dropdown. |
| Create session    | `POST /api/sessions` | Body: `{ "tenantId": "..." }`. Called once when Chat loads and no session exists. |
| Send message      | `POST /api/sessions/{sessionId}/messages` | Body: `{ "content": "...", "taskQueue": "..." }`. Backend creates message + run, starts workflow, returns `messageId`, `runId`. |
| List messages     | `GET /api/sessions/{sessionId}/messages` | Load history when opening the conversation. |
| Run events (SSE)  | `GET /api/runs/{runId}/events` | Server-Sent Events stream: catch-up then live. Each event is an `OloExecutionEvent` (nodeType, status, input, output, etc.). |
| WebSocket         | `ws://.../ws` (base from `VITE_API_BASE`) | Liveness: app connects and sends PING every 10s; PONG (and PING) are pushed into Run Events and shown in the Events panel. Optional: `SUBSCRIBE_RUN` for run events (see [olo/docs/WEBSOCKET.md](../olo/docs/WEBSOCKET.md)). |

Optional:

- **Human input** — When the run is in `waiting_human`, the UI could call `POST /api/runs/{runId}/human-input` with `{ "approved": true, "message": "..." }` and the backend signals the workflow.

Payload examples for all of the above are in [olo/docs/API_PAYLOADS.md](../olo/docs/API_PAYLOADS.md).

---

## UI behavior

- **Tenant & queues** — The top dropdown is filled from `GET /api/tenants`. Under Chat and RAG, the selected tenant’s queues are loaded with `GET /api/tenants/{tenantId}/queues`. Choosing a queue loads its config (`GET /api/tenants/{tenantId}/queues/{queueName}/config`); the Conversation sidebar shows a pipeline dropdown from config’s `pipelines` when a queue is selected.
- **Session** — On first load (and when no session is stored), the app creates one session per tenant (default tenant from backend when no `?tenant=` in the URL). All messages in the view belong to that session.
- **Message list** — Fetched with `GET /api/sessions/{sessionId}/messages`. After each send, the list is refetched so the new user message appears.
- **Run events** — After sending, the frontend opens the SSE stream for the returned `runId` and appends each event to the **Run events** list in the right panel. The app also connects to the WebSocket and sends PING every 10s; PING and PONG are shown in the same Run events list (liveness). The Events panel has its own scrollbar; the bell in the header toggles the Events panel.
- **Assistant reply** — The UI takes the last run event with `nodeType === "MODEL"`, `status === "COMPLETED"`, and uses `output.content` or `output.text` (or a stringified `output`) as the assistant message. When the backend persists the final assistant message in the message store, the list could be refetched to show it in the history; currently the reply is derived from the event stream.
- **Panels** — Left panel (tenant, section, queues), Conversation panel (tools, pipeline), and Events panel each have independent resize handles and scroll: left menu scrolls; Conversation content scrolls; Run Events list scrolls independently with header fixed.

---

## Execution model (backend)

Execution is described by **OloExecutionEvent** records: runId, nodeId, parentNodeId, nodeType (SYSTEM, PLANNER, MODEL, TOOL, HUMAN), status (STARTED, COMPLETED, FAILED, WAITING), timestamp, input, output, metadata. The Chat UI does not build a tree; it shows a flat, ordered list of events for the current run. Tree/DAG views and replay/diff are the responsibility of the Admin BE and tooling (see [olo/docs/DESIGN.md](../olo/docs/DESIGN.md)).

---

## Related docs

- [README.md](./README.md) — Overview, run instructions, project layout.
- **olo/docs/** — ARCHITECTURE.md, DESIGN.md, API_PAYLOADS.md, WEBSOCKET.md, DEMO.md.
