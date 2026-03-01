# UI Features

This document describes all user-facing UI features of the olo-chat frontend: layout, sections, panels, and interactions.

---

## Overview

The app is a multi-panel layout with URL-driven navigation. Main areas:

- **Top bar** — Logo (home), theme toggle
- **Left panel** — Tenant dropdown, section navigation (Chat, RAG, Documents), and under Chat/RAG: workflow queues
- **Center** — Main content (Chat conversation, RAG/Documents placeholders)
- **Tools panel** — Conversation sidebar: pipeline dropdown, sessions list, New chat, Delete (per session / all), contextual tools
- **Properties panel** — Right sidebar: Run events (Chat) or tenant config form; toggle to expand/collapse

Panel widths are resizable and persisted in `localStorage`. Panel open/closed state is stored in the URL query (`menu`, `tools`, `props`).

---

## Top bar

| Feature | Description |
|--------|-------------|
| **Logo** | Olo logo; click navigates to default home path (Chat → Conversation) while keeping tenant and panel query. |
| **Theme toggle** | Switches between light and dark theme. Theme is persisted in `localStorage` (`olo-theme`) and applied via `data-theme` on the document. |

---

## Left panel

| Feature | Description |
|--------|-------------|
| **Toggle** | Expand/collapse the left panel. State is reflected in URL query `menu` (0 = collapsed, 1 = expanded). |
| **Tenant dropdown** | Lists tenants from `GET /api/tenants`. Selected tenant is stored in URL query `tenant`. Default: last selected or first tenant from the list. |
| **Section navigation** | Sections: **Chat**, **RAG**, **Documents**. Each section has sub-options. Clicking a section/sub updates the URL path (e.g. `/chat/conversation`, `/rag/overview`). |
| **Chat / RAG queues** | Under Chat and RAG, workflow queue names from `GET /api/tenants/{tenantId}/queues` are listed. Selecting a queue sets the current “queue” for that section (used as `taskQueue` when sending messages and for pipeline config). Queue names may include version (e.g. `olo-chat-queue-oolama:1.0`); display names are shortened via `queueDisplayName()`. |
| **Expand / collapse categories** | Categories (sections) can be expanded or collapsed in the menu; “Expand all” / “Collapse all” available when the panel is expanded. |
| **Context menu** | Right-click on the menu area opens a context menu (e.g. expand/collapse). |
| **Events indicator** | When there are run events, the left panel can show an indicator that there is something to review in the Events panel. |

Sections and visibility are controlled by **feature flags** (`config/features.ts`). Disabled sections are not shown and invalid section paths redirect to the default path.

---

## Main content

Content depends on the current section and sub-option.

### Chat → Conversation

| Feature | Description |
|--------|-------------|
| **Header** | Title “Chat” and subtitle “→ Conversation with Olo backend”. |
| **Chat view** | Message list, text input, send button, and (when a run is active) live run events and assistant reply derived from the event stream. |
| **Session** | On first load (or when no session exists), the app creates a session via `POST /api/sessions` for the current tenant (and optional queue/pipeline). Messages belong to the selected session. |
| **Message list** | Fetched with `GET /api/sessions/{sessionId}/messages`. User and assistant messages are shown; assistant content comes from the last MODEL COMPLETED event or from `GET /api/runs/{runId}/response` when the run completes. |
| **Input & Send** | User types in the input; Send submits via `POST /api/sessions/{sessionId}/messages` with `content` and optional `taskQueue`. While a run is in progress, Send is disabled until the run completes (or fails). |
| **Resend** | User can resend a previous user message (triggers a new run). |
| **Common prompts** | Optional quick-select prompts (e.g. “Hello, what can you help me with?”) to fill the input. |
| **Health** | App checks `GET /api/health`; connection status can be shown (e.g. backend not reachable). |
| **Errors** | API or stream errors are shown in the chat area with optional retry. |

### RAG

| Feature | Description |
|--------|-------------|
| **Header** | Section title and current sub-option (e.g. Overview). |
| **Content** | Placeholder: “RAG: **{label}** — configuration and status (placeholder).” |

### Documents

| Feature | Description |
|--------|-------------|
| **Header** | Section title and current sub-option (RAG upload). |
| **Content** | RAG upload: dropdown of existing RAG (from `VITE_RAG_OPTIONS`), plus an optional text field to use a different RAG for the upload; file/folder selector with drag-and-drop; **Start RAG** button fires the upload API, which uses queue/pipeline from env (`VITE_RAG_QUEUE`, `VITE_RAG_PIPELINE`) to create the workflow. |

---

## Tools panel (Conversation)

| Feature | Description |
|--------|-------------|
| **Toggle** | Expand/collapse; state in URL query `tools` (0/1). Collapsed label: “Conversation”. |
| **Pipeline dropdown** | Shown for Chat and RAG when a queue is selected. Pipelines come from `GET /api/tenants/{tenantId}/queues/{queueName}/config` (`pipelines` array). Selecting a pipeline filters the session list and is used when creating a new session. |
| **New chat** | Creates a new session (`POST /api/sessions`) with current tenant, queue, and pipeline; clears events and selects the new session. Only in Chat when a queue is selected. |
| **Sessions list** | Sessions for the current tenant + queue + pipeline (`GET /api/tenants/{tenantId}/sessions` with optional queue/pipeline). Each session shows a **primary label**: custom name (if set), otherwise a truncated **first-message preview** (auto-set when messages load), otherwise date/time. If you set a custom name, a **subtitle** shows a truncated first message so the list stays scannable with many sessions. **Edit** (✎) opens an inline field to set or clear the custom name; persisted in `localStorage` with the first-message cache so the list stays usable with 40+ sessions. |
| **Delete session** | Per-session delete (×) calls `DELETE /api/sessions/{sessionId}` and refreshes the list. If the deleted session was selected, the first remaining session is selected. |
| **Delete all** | Deletes all sessions for the current tenant/queue/pipeline via the API and clears selection and run events. |
| **Contextual tools** | Optional tool entries from the tool registry (e.g. quick-actions, filters, search). Tool components receive context (section, sub, runSelected, storeContext); if no component is registered, label/description are shown. |

The Tools panel is hidden for the Documents section and when the tenant config form is shown.

---

## Properties panel (right sidebar)

| Feature | Description |
|--------|-------------|
| **Toggle** | Expand/collapse; state in URL query `props` (0/1). Collapsed label: “Events”. The toggle button is the primary way to open/close the Events panel. |
| **Run events (Chat)** | When the section is Chat, the panel shows **EventsList**: a list of run events (PLANNER, MODEL, TOOL, HUMAN, SYSTEM) for the current run. Liveness events (PING/PONG) are excluded from the list. Last N events (e.g. 25) are shown; each item can be expanded to show timestamp, input, output, metadata. List auto-scrolls to the bottom as new events arrive. |
| **Tenant config** | When editing tenant configuration, the panel shows **TenantConfigForm** (add new tenant or edit existing). Saving/deleting uses the tenant config store and REST API. |
| **Empty state** | When there is no run yet: “Send a message in Chat to see run events here.” When run is set but no events: “Waiting for events…”. |

---

## URL and query

| Aspect | Description |
|--------|-------------|
| **Path** | `/:sectionId/:subId` (e.g. `/chat/conversation`, `/rag/overview`). Sub-ids are encoded (e.g. queue names with `:1.0`). Invalid paths redirect to the last valid path or default (`/chat/conversation`). |
| **Query** | `tenant`, `menu`, `tools`, `props`. Used for tenant selection and panel open/closed state. Enables deep links, back/forward, and bookmarking. |
| **Default path** | `/chat/conversation` when no previous selection is stored. |
| **Last path / tenant** | Last selected path and tenant are stored in `localStorage` and used when opening `/` or when the backend list doesn’t contain the current tenant. |

---

## Resizable panels

| Panel | Default width | Min / max | Persistence |
|-------|----------------|-----------|-------------|
| Left | 260px | 160–480px | `localStorage` key `olo:panel-widths` |
| Tools | 220px | 160–400px | Same |
| Properties | 260px | 160–480px | Same |

Resize handles between panels update the store and persisted widths; CSS variables (`--panel-width-left`, etc.) drive layout.

---

## Feature flags

Sections can be turned on/off via `config/features.ts`:

- **chat** — Chat section (default on).
- **rag** — RAG section (default on).
- **documents** — Documents section (default on).

If the URL refers to a disabled section, the app redirects to the default path.

---

## Observability

- **Navigation events** | When the user navigates (section, sub, runId), a navigation event is logged (e.g. for analytics) via `lib/observability.ts`. In development, `import.meta.env.DEV` is used for debug logging.

---

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Application architecture, state, and data flow.
- [CHAT_UI.md](./CHAT_UI.md) — Chat section in detail (APIs, execution model).
- [README.md](./README.md) — Overview and run instructions.
