# olo-chat

Frontend for the **Olo** chat flow. It provides a chat UI that talks to the **olo** backend (REST + SSE) for sessions, messages, runs, and live execution events.

---

## Documentation

| Doc | Description |
|-----|-------------|
| **[UI_FEATURES.md](./UI_FEATURES.md)** | All UI features: top bar, left panel (tenant, sections), main content (Chat, Knowledge, Documents), Tools panel (Conversation / Knowledge sources), Properties panel (Events, tenant config), URL/query, resizable panels, feature flags. |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Technical architecture: stack, routing, Zustand state, API layer, config, lib, component tree, and Chat data flow. |
| **[CHAT_UI.md](./CHAT_UI.md)** | Chat section in detail: APIs used, queue vs pipeline, UI behavior, execution model. |
| **[DOCKER.md](./DOCKER.md)** | Docker build/run, env vars, Docker Compose (dev/prod), GitHub Actions. |
| **[DOCKER_HUB_DESCRIPTION.md](./DOCKER_HUB_DESCRIPTION.md)** | Copy-paste description for the Docker Hub image page (Full Description). |

---

## Overview

- **Chat** — Create a session, send messages, and see run events (PLANNER, MODEL, TOOL, HUMAN, plus WebSocket PING/PONG liveness) streamed in real time. Backed by `POST /api/sessions`, `POST /api/sessions/{sessionId}/messages`, `GET /api/runs/{runId}/events` (SSE), and optional WebSocket `/ws`.
- **Knowledge** — Three sub-options: **Sources** (list of knowledge sources in the second panel), **Create new**, **Status** (indexed, processing). Main content and list are placeholders until APIs are wired.
- **Documents** — **Upload / manage raw files**: select or enter a knowledge source, choose files or folder (drag-drop or browse), then **Start RAG** to trigger the upload workflow (queue/pipeline from `VITE_RAG_QUEUE`, `VITE_RAG_PIPELINE`).
- **Tenant & queues** — Top dropdown uses `GET /api/tenants`. Under Chat, the Conversation panel has Queue and Pipeline dropdowns (from `GET /api/tenants/{tenantId}/queues` and queue config); session list is scoped by selected queue and pipeline.

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

3. Open **http://localhost:3000**. The app opens at **Chat → Conversation**. Use the top tenant dropdown; in the Conversation panel (right of main content) select a Queue and Pipeline to scope the session list and new chats.

---

## Chat flow (high level)

1. **Session** — On New chat, the app creates a session via `POST /api/sessions` with `tenantId`, and optionally `taskQueue`, `queueName`, `pipelineId` (from the Conversation panel). See [CHAT_UI.md](./CHAT_UI.md) for the full contract.
2. **Send message** — User types and sends; frontend reads queue from store and calls `POST /api/sessions/{sessionId}/messages` with `content` and `taskQueue`. Backend creates the message and run, starts the Temporal workflow, and returns `messageId` and `runId`.
3. **Run events** — Frontend subscribes to run events (SSE or WebSocket) and appends them to the Events panel; event history is not cleared on Send. When a MODEL node completes with output, that content is shown as the assistant reply; empty or metadata-only response shows a fallback message.

For full flow details (planner → tool → model → human → final answer), see [olo/docs/DESIGN.md](../olo/docs/DESIGN.md) and [olo/docs/ARCHITECTURE.md](../olo/docs/ARCHITECTURE.md).

---

## Project layout (relevant to chat)

- `src/api/chatApi.ts` — Chat API client: sessions, messages, SSE run events, health, tenants, queues, queue config (pipelines). All use `/api` (base from `VITE_API_BASE`).
- `src/components/LeftPanel.tsx` — Section nav; tenant dropdown (GET /api/tenants); Chat shows only Conversation submenu (queues are in the Conversation panel).
- `src/components/MainContent.tsx` — Renders main content: `ChatView` for Chat, `KnowledgeView` for Knowledge, `RAGUploadView` for Documents (upload).
- `src/components/ToolsPanel.tsx` — **Chat**: Conversation sidebar (Queue dropdown, Pipeline dropdown, New chat, sessions list, delete). **Knowledge**: list of knowledge sources (`KnowledgeSourcesList`). Hidden for Documents.
- `src/api/ragApi.ts` — Documents upload (`POST /api/rag/upload`), knowledge source options from `VITE_RAG_OPTIONS`; queue/pipeline from `VITE_RAG_QUEUE`, `VITE_RAG_PIPELINE`.
- `src/components/EventsList.tsx` — Run events (and WebSocket PING/PONG) in the right panel; bell toggles Events panel.
- `src/components/PropertiesPanel.tsx` — Right side panel (Events or tenant config); independent scroll for Run Events list.
- `src/store/runEvents.ts` — Run events and liveness events (WebSocket PING/PONG); fed by SSE and `useWebSocketLiveness`.
- `src/hooks/useWebSocketLiveness.ts` — Connects to `/ws`, sends PING every 10s, pushes PING/PONG into run events for UI.
- `src/types/layout.ts` — Section config; **Chat** is the first section and default route `/chat/conversation`.

---

## Configuration

- **Backend URL** — In development, set `VITE_API_BASE=http://localhost:7080` in `.env.development`. The Vite proxy sends `/api` to that base; see `vite.config.ts` and `server.proxy`.
- **Tenant** — Chat uses `tenantId` from the URL query (`?tenant=...`) or the backend’s default tenant (`GET /api/tenants` returns `[{ "id": "...", "name": "Default" }]` when JWT is disabled). See [WEBSOCKET.md](../olo/docs/WEBSOCKET.md).
- **Documents upload** — Set `VITE_RAG_OPTIONS` (comma-separated knowledge source ids) for the Documents upload dropdown. Set `VITE_RAG_QUEUE` and `VITE_RAG_PIPELINE` for the upload workflow. See [DOCKER.md](./DOCKER.md).
- **Panels** — Left panel (tenant + sections), Conversation (Chat: pipeline, New chat, sessions; Knowledge: knowledge sources list), and Events (Chat run events). The Events toggle opens/closes the right panel.
