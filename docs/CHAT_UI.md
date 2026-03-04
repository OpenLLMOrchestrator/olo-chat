# Chat UI

This document describes the **Chat** conversation flow in olo-chat: behavior, APIs used, and how it aligns with the olo backend.

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
| List queues       | `GET /api/tenants/{tenantId}/queues` | Queue names for selected tenant; shown in the Conversation panel Queue dropdown. |
| Queue config      | `GET /api/tenants/{tenantId}/queues/{queueName}/config` | Queue config JSON (e.g. `pipelines` array) for the Conversation panel Pipeline dropdown. |
| List sessions     | `GET /api/tenants/{tenantId}/sessions?queue=...&pipeline=...` | Sessions for the selected queue and pipeline. `queue` is the display name (no version suffix, e.g. `olo-chat-queue-oolama-debug`). |
| Create session    | `POST /api/sessions` | Body: `{ "tenantId": "...", "taskQueue": "...", "queueName": "...", "pipelineId": "...", "overrides": { ... } }`. All except `tenantId` are optional. `taskQueue`, `queueName`, and `pipelineId` come from the Conversation panel (read from store at create time). Called when user clicks New chat. |
| Send message      | `POST /api/sessions/{sessionId}/messages` | Body: `{ "content": "...", "taskQueue": "..." }`. `taskQueue` is read from the store at send time. Backend creates message + run, starts workflow, returns `messageId`, `runId`. |
| List messages     | `GET /api/sessions/{sessionId}/messages` | Load history when opening the conversation. |
| Run events (SSE)  | `GET /api/runs/{runId}/events` | Server-Sent Events stream: catch-up then live. Each event is an `OloExecutionEvent` (nodeType, status, input, output, etc.). |
| WebSocket         | `ws://.../ws` (base from `VITE_API_BASE`) | Liveness: app connects and sends PING every 10s; PONG (and PING) are pushed into Run Events and shown in the Events panel. Optional: `SUBSCRIBE_RUN` for run events (see [olo/docs/WEBSOCKET.md](../olo/docs/WEBSOCKET.md)). |

Optional:

- **Human input** — When the run is in `waiting_human`, the UI could call `POST /api/runs/{runId}/human-input` with `{ "approved": true, "message": "..." }` and the backend signals the workflow.

Payload examples for all of the above are in [olo/docs/API_PAYLOADS.md](../olo/docs/API_PAYLOADS.md).

---

## Create session (POST /api/sessions)

The frontend and backend contract for creating a session:

**Request body:**

```json
{
  "tenantId": "...",
  "taskQueue": "...",
  "queueName": "...",
  "pipelineId": "...",
  "overrides": { }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| **tenantId** | Yes | Tenant for the session. |
| **taskQueue** | No | Workflow task queue (display name, from Conversation panel Queue dropdown). |
| **queueName** | No | Queue name stored on the session (same as taskQueue when creating). |
| **pipelineId** | No | Pipeline within the queue (from Conversation panel Pipeline dropdown). |
| **overrides** | No | Reserved for future use (e.g. model/tool overrides). |

The frontend reads the current queue and pipeline from the store at create time and sends this when the user clicks **New chat**.

---

## Queue vs pipeline

- **Queue** (Conversation panel) — The workflow queue name (e.g. from API with version; display name strips version). Listed in the Conversation panel; selecting a queue loads its config and populates the Pipeline dropdown. Default: first or previously selected queue.
- **Pipeline** (Conversation panel) — A **classification within the selected queue**, used by workflow execution. Loaded from the queue’s config (`GET /api/tenants/{tenantId}/queues/{queueName}/config`); the config’s `pipelines` array populates the Pipeline dropdown. Session list and new sessions are scoped by the selected queue and pipeline.

---

## UI behavior

- **Tenant & queues** — The top dropdown is filled from `GET /api/tenants`. Under Chat, the selected tenant’s **workflow queues** are loaded with `GET /api/tenants/{tenantId}/queues`. Choosing a queue loads its config; the Conversation sidebar then shows the **Pipeline** dropdown (classification within that queue) from the config’s `pipelines`.
- **Session** — User selects a session from the list or clicks New chat. New chat creates a session via POST /api/sessions with tenantId, taskQueue, queueName, pipelineId (from store). All messages in the view belong to the selected session.
- **Message list** — Fetched with `GET /api/sessions/{sessionId}/messages`. After each send, the list is refetched. When the assistant response is empty or metadata-only, the UI shows: *"Apologise, Couldn't generate the response for your query."*
- **Run events** — After sending, the frontend subscribes to events for the returned runId (SSE or WebSocket) and appends each event to the Run events list. Event history is not cleared when the user clicks Send. The app also connects to the WebSocket and sends PING every 10s (liveness). The Events panel has its own scrollbar; the bell toggles the Events panel.
- **Assistant reply** — The UI takes the last run event with MODEL COMPLETED and uses output.content or output.text as the assistant message. Empty or metadata-only output shows the fallback message above. When the run completes, messages are refetched.
- **Panels** — Left panel (tenant, section; Chat shows only Conversation), Conversation panel (Queue, Pipeline, New chat, sessions), and Events panel each have independent resize handles and scroll.

---

## Execution model (backend)

Execution is described by **OloExecutionEvent** records: runId, nodeId, parentNodeId, nodeType (SYSTEM, PLANNER, MODEL, TOOL, HUMAN), status (STARTED, COMPLETED, FAILED, WAITING), timestamp, input, output, metadata. The Chat UI does not build a tree; it shows a flat, ordered list of events for the current run. Tree/DAG views and replay/diff are the responsibility of the Admin BE and tooling (see [olo/docs/DESIGN.md](../olo/docs/DESIGN.md)).

---

## Related docs

- [README.md](./README.md) — Overview, run instructions, project layout.
- **olo/docs/** — ARCHITECTURE.md, DESIGN.md, API_PAYLOADS.md, WEBSOCKET.md, DEMO.md.
