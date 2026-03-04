# Architecture

This document describes the technical architecture of the olo-chat frontend: stack, routing, state, API layer, config, and main data flows.

---

## High-level stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Browser (React 18). |
| **Build** | Vite 5, TypeScript. |
| **UI** | React 18, React Router 7. |
| **State** | Zustand (global stores); no Redux. |
| **Backend** | olo backend (Spring Boot) at `VITE_API_BASE` (e.g. `http://localhost:7080`). All API and WebSocket URLs are derived from this base. |

The app is a single-page application (SPA). The backend is the source of truth for sessions, messages, runs, tenants, queues, and run events.

---

## Routing

- **Router** | React Router (`BrowserRouter`) with a single root route; navigation is path + search params.
- **Path format** | `/:sectionId/:subId` (e.g. `/chat/conversation`, `/rag/overview`). Optional run-level routes (e.g. `/:sectionId/run/:runId/:subId`) are parsed in `routes.ts`; the app currently uses section + sub only for the main views.
- **Path parsing** | `routes.ts`: `parsePath()`, `buildPath()`, `buildPathWithQuery()`, `parseQuery()`, `buildQuery()`. Valid section IDs come from `types/layout.ts` (`SectionId`); invalid paths redirect to the default path or last stored path.
- **Query params** | `tenant`, `menu`, `tools`, `props` — drive tenant selection and panel expanded state. Synced from URL to store in `App.tsx` so that back/forward and deep links work.
- **Default path** | `DEFAULT_PATH = '/chat/conversation'`.

---

## State (Zustand stores)

All global UI and domain state lives in Zustand stores under `src/store/`.

| Store | Purpose |
|-------|---------|
| **ui** (`store/ui.ts`) | Panel expanded state (left, tools, properties), panel widths (persisted to `localStorage`), theme (light/dark, persisted), current navigation (sectionId, subId, runId, tenantId). URL sync in `App` pushes path/query into this store. |
| **chatSessions** (`store/chatSessions.ts`) | List of session summaries and the selected session ID. Updated when sessions are fetched or user selects a session. |
| **runEvents** (`store/runEvents.ts`) | Current run ID and list of run events (SSE/WebSocket). `addEvent()` appends events; the list is **not cleared when the user clicks Send** so event history accumulates. `setOnRunEventCallback()` registers a callback used by ChatView (e.g. to poll run response or refetch messages). Liveness (PING/PONG) events are stored here too but filtered out in the Events list UI. |
| **conversationPanel** (`store/conversationPanel.ts`) | Selected queue ID and pipeline ID in the Conversation panel. Scopes session list, new-session creation, and send-message for Chat. Queue and pipeline are read from the store at send/new-chat time to avoid stale values. |
| **tenantConfig** (`store/tenantConfig.ts`) | Tenants list (from `GET /api/tenants`), loading flag, selected tenant for config form, “adding new” flag. Actions: loadTenants, selectTenant, startAddNew, saveTenant, deleteTenant. Tenant CRUD uses `api/rest.ts`; list comes from `chatApi.getTenants()`. |

Stores are used via `store((s) => s.x)` for subscriptions; actions are called as `store.getState().action()` or from components that already have the selector.

---

## API layer

| Module | Purpose |
|--------|---------|
| **chatApi** (`api/chatApi.ts`) | All olo backend calls: health, tenants, queues, queue config, sessions (create, list, delete, delete all), messages (list), send message, runs (get, events SSE, response). Base URL is `VITE_API_BASE` + `/api`. |
| **ragApi** (`api/ragApi.ts`) | Documents upload `POST /api/rag/upload` (FormData: ragId, files; optional taskQueue, pipelineId from env). `getExistingRAGOptions()` returns ids from `VITE_RAG_OPTIONS` for the Documents upload dropdown. |
| **rest** (`api/rest.ts`) | Tenant configuration REST API (save, update, delete tenant) used by the tenant config store. May point to a different base than the chat backend in some setups. |

Types (e.g. `ChatMessageDto`, `RunEventDto`, `SessionSummaryDto`, `TenantDto`, `QueueConfigDto`) are defined in `chatApi.ts` or `types/tenant.ts`.

---

## Config and feature flags

| Module | Purpose |
|--------|---------|
| **features** (`config/features.ts`) | Feature flags per section (chat, knowledge, documents). `isFeatureEnabled(id)` is used to hide sections and redirect invalid section paths. |
| **layout** (`types/layout.ts`) | `SECTIONS` array: Chat (conversation only in left panel), Knowledge (sources, create, status), Documents (upload). Drives left-panel menu and valid sub-ids. Queues are in the Conversation panel (Tools), not the left panel. |
| **toolRegistry** (`config/toolRegistry.ts`) | Map of tool id → metadata (label, description, slot). Optional map of tool id → React component. Tools receive `ToolContext` (sectionId, subId, runSelected, storeContext). `getToolsForView(sectionId, subId, runSelected)` returns tools for the current view; layout can attach `toolIds` to sub-options. |

---

## Lib and shared utilities

| Module | Purpose |
|--------|---------|
| **wsUrl** (`lib/wsUrl.ts`) | `getWebSocketUrl(accessToken?)` — builds `ws(s)://.../ws` from `VITE_API_BASE`; `getWsAccessToken()` — sessionStorage or `VITE_WS_ACCESS_TOKEN`. |
| **wsSingleton** (`lib/wsSingleton.ts`) | Single shared WebSocket connection; `getCurrentSocket()`, `subscribeToRun(runId)` for run events. Used by ChatView when sending a message (SSE fallback if no WebSocket). |
| **useWebSocketLiveness** (`hooks/useWebSocketLiveness.ts`) | Connects to `/ws`, sends PING at `VITE_WS_PING_INTERVAL_SEC` (default 10), pushes PING/PONG into `runEventsStore`. |
| **observability** (`lib/observability.ts`) | `logEvent(name, props)` for navigation/analytics; uses `import.meta.env.DEV` for debug. |
| **lastSelectedPath** / **lastTenant** | Persist last path and tenant in `localStorage` for defaulting on load. |
| **queueDisplayName** / **tenantDisplay** | Format queue and tenant names for display. |

---

## Component tree (simplified)

```
App
├── TopBar (logo, theme toggle)
└── app-body (CSS vars for panel widths)
    ├── LeftPanel (tenant, sections; Chat shows only Conversation submenu)
    ├── PanelResizeHandle (left)
    ├── ToolsPanel (Chat: Queue dropdown, Pipeline dropdown, New chat, sessions list, Delete; Knowledge: sources list)  [hidden for documents / tenant config]
    ├── PanelResizeHandle (tools)
    ├── MainContent
    │   ├── ChatView (when sectionId === 'chat') — messages, input, send, run events; queue/pipeline from store
    │   ├── KnowledgeView (when sectionId === 'knowledge')
    │   ├── RAGUploadView (when sectionId === 'documents', subId === 'upload')
    │   └── placeholder for other sections
    ├── PanelResizeHandle (properties)
    └── PropertiesPanel (Events list or TenantConfigForm)
        ├── EventsList (Chat)
        └── TenantConfigForm (when editing tenant)
```

- **App** owns URL ↔ store sync, tenant defaulting, and panel query updates. It passes section/sub, tenant, runId, and callbacks into panels and MainContent.
- **ChatView** owns session/message/run state: creates session (with taskQueue, queueName, pipelineId from store), fetches sessions for selected queue+pipeline (queue as display name), fetches messages, sends messages (taskQueue from store), subscribes to run events (SSE or WebSocket), derives assistant reply from events or run response API. Empty or metadata-only assistant response shows a fallback message.
- **LeftPanel** renders section/sub; under Chat only "Conversation" is shown (no queue list in left panel).
- **ToolsPanel** (Chat): fetches queues and queue config (pipelines), renders Queue and Pipeline dropdowns, session list (scoped by selection), New chat, delete session (optimistic remove), delete all. Triggers New chat via `onNewChat` from App.
- **EventsList** reads from `runEventsStore` and renders the last N run events (excluding liveness); event history is not cleared on Send.

---

## Data flow (Chat)

1. **Load** — App syncs URL to ui store; tenantConfig loads tenants. ToolsPanel fetches queues and sets first (or previous) queue, then pipelines. ChatView fetches sessions for tenant + selected queue (display name) + pipeline; if no queue selected, session list is empty. User selects or creates session; messages fetched.
2. **Send message** — User sends; ChatView reads queue from store, calls sendMessage with taskQueue; backend returns runId. ChatView subscribes to events; new events append (event history not cleared). Assistant text from MODEL COMPLETED or run response API; empty response shows fallback message. On completion, Send re-enabled and messages refetched.
3. **New chat** — User clicks “New chat” in ToolsPanel ; App increments trigger; ChatView reads queue and pipeline from store, creates session (tenantId, taskQueue, queueName, pipelineId), selects new session, refetches list. Event history is not cleared.
4. **Switch session** — User selects another session in the list → ChatView updates selectedSessionId, refetches messages for that session.
5. **Run events panel** — EventsList reads runEventsStore; new events append (history persists across sends); panel scrolls to bottom; user can expand an event to see input/output/metadata.

---

## Environment and build

- **Build-time env** | `VITE_API_BASE`, `VITE_WS_ACCESS_TOKEN`, `VITE_WS_PING_INTERVAL_SEC` are baked in by Vite. Used in `api/chatApi.ts`, `lib/wsUrl.ts`, `hooks/useWebSocketLiveness.ts`. See [DOCKER.md](./DOCKER.md) for Docker and env details.
- **Dev proxy** | In development, Vite can proxy `/api` to the backend so the same origin is used; the app still uses `VITE_API_BASE` for API and WebSocket URLs when set.

---

## Related docs

- [UI_FEATURES.md](./UI_FEATURES.md) — User-facing features and layout.
- [CHAT_UI.md](./CHAT_UI.md) — Chat APIs and execution model.
- [README.md](./README.md) — Overview and run instructions.
- [DOCKER.md](./DOCKER.md) — Docker and environment variables.
