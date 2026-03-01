# olo-chat

Frontend for the **Olo** chat flow. It provides a chat UI that talks to the **olo** backend (REST + SSE) for sessions, messages, runs, and live execution events.

---

## Overview

- **Chat** — Primary view: create a session, send messages, and see run events (PLANNER, MODEL, TOOL, HUMAN, plus WebSocket PING/PONG liveness) streamed in real time. Backed by `POST /api/sessions/{sessionId}/messages`, `GET /api/runs/{runId}/events` (SSE), and optional WebSocket `/ws` for run events and liveness.
- **Tenant & queues** — Top dropdown uses `GET /api/tenants` (default tenant from backend config; Redis-discovered tenants when available). Under Chat and RAG, queues are listed from `GET /api/tenants/{tenantId}/queues` (Redis keys `<tenantId>:olo:kernel:config:*`). Selecting a queue loads config via `GET /api/tenants/{tenantId}/queues/{queueName}/config`; pipelines from config drive the Conversation pipeline dropdown.
- **Other sections** (Build, Run, Investigate, System) — Additional views; some APIs (e.g. tenant configuration) may require a separate backend or configuration.

The app defaults to the **Chat** section and uses the **olo** backend as the source of truth for chat (sessions, messages, runs, execution events, tenants, queues).

---

## Backend

The chat UI is designed to work with the **olo** backend in this repo:

| Repo path   | Role                    |
|------------|--------------------------|
| **olo**    | Chat backend (Spring Boot). REST + SSE at `/api`. Default port **7080**. |
| **olo-chat** | This frontend (Vite + React). Proxies `/api` to the olo backend. |

**Relevant backend docs** (in `olo/docs/`, relative to repo root):

- **[ARCHITECTURE.md](../olo/docs/ARCHITECTURE.md)** — System overview, components, data flow (olo-chat → Chat BE → olo-sdk → Temporal).
- **[DESIGN.md](../olo/docs/DESIGN.md)** — Detailed design: domain objects, execution model, API contracts, persistence.
- **[API_PAYLOADS.md](../olo/docs/API_PAYLOADS.md)** — Example request/response payloads for sessions, messages, runs, SSE, human-input.
- **[WEBSOCKET.md](../olo/docs/WEBSOCKET.md)** — WebSocket endpoint for run events (alternative to SSE).
- **[DEMO.md](../olo/docs/DEMO.md)** — How to build and run the backend, Temporal, and executor.

---

## Run the app

1. **Start the olo backend** (default port 7080), e.g. from the `olo` directory:
   ```bash
   ./gradlew bootRun
   ```
   See [olo/docs/DEMO.md](../olo/docs/DEMO.md) for full setup (Temporal, executor).

2. **Start olo-chat** (from this directory):
   ```bash
   npm install
   npm run dev
   ```
   The dev server runs on port **3000**. API calls use `VITE_API_BASE` (e.g. in `.env.development`: `VITE_API_BASE=http://localhost:7080`); the Vite proxy sends `/api` to that base URL.

3. Open **http://localhost:3000**. The app waits for the backend to be reachable at `/api/health`, then opens at **Chat → Conversation**. Use the top tenant dropdown (from `GET /api/tenants`); select a queue under Chat or RAG to see pipelines in the Conversation panel.

---

## Chat flow (high level)

1. **Session** — On first load, the app creates a session via `POST /api/sessions` with a tenant ID (default tenant from backend config when no JWT).
2. **Send message** — User types and sends; frontend calls `POST /api/sessions/{sessionId}/messages` with `content`. Backend creates the message and run, starts the Temporal workflow, and returns `messageId` and `runId`.
3. **Run events** — Frontend subscribes to `GET /api/runs/{runId}/events` (SSE) and shows PLANNER, MODEL, TOOL, HUMAN (and SYSTEM) events as they arrive. When a MODEL node completes with output, that content is shown as the assistant reply.

For full flow details (planner → tool → model → human → final answer), see [olo/docs/DESIGN.md](../olo/docs/DESIGN.md) and [olo/docs/ARCHITECTURE.md](../olo/docs/ARCHITECTURE.md).

---

## Project layout (relevant to chat)

- `src/api/chatApi.ts` — Chat API client: sessions, messages, SSE run events, health, tenants, queues, queue config (pipelines). All use `/api` (base from `VITE_API_BASE`).
- `src/components/LeftPanel.tsx` — Section nav; tenant dropdown (GET /api/tenants); Chat/RAG with queue sub-options.
- `src/components/MainContent.tsx` — Renders chat/rag content; `QueuesList` for Chat/RAG; `ChatView` for conversation.
- `src/components/ToolsPanel.tsx` — Conversation sidebar: pipeline dropdown from queue config, tools list.
- `src/components/EventsList.tsx` — Run events (and WebSocket PING/PONG) in the right panel; bell toggles Events panel.
- `src/components/PropertiesPanel.tsx` — Right side panel (Events or tenant config); independent scroll for Run Events list.
- `src/store/runEvents.ts` — Run events and liveness events (WebSocket PING/PONG); fed by SSE and `useWebSocketLiveness`.
- `src/hooks/useWebSocketLiveness.ts` — Connects to `/ws`, sends PING every 10s, pushes PING/PONG into run events for UI.
- `src/types/layout.ts` — Section config; **Chat** is the first section and default route `/chat/conversation`.

---

## Configuration

- **Backend URL** — In development, set `VITE_API_BASE=http://localhost:7080` in `.env.development`. The Vite proxy sends `/api` to that base; see `vite.config.ts` and `server.proxy`.
- **Tenant** — Chat uses `tenantId` from the URL query (`?tenant=...`) or the backend’s default tenant (`GET /api/tenants` returns `[{ "id": "...", "name": "Default" }]` when JWT is disabled). See [WEBSOCKET.md](../olo/docs/WEBSOCKET.md).
- **Panels** — Left panel (tenant + section + queues), Conversation (tools + pipeline), and Events (run events) each have independent resize handles and scroll: left menu scrolls; Conversation panel content scrolls; Run Events list has its own scrollbar. The bell toggles the Events panel.
