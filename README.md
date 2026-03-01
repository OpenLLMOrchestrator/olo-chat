# Olo (frontend)

REST-oriented frontend for Olo. Built with React, TypeScript, and Vite. Proxies `/api` to the backend (olo-be).

## Requirements

- Node.js 18+
- npm or pnpm

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

App runs at `http://localhost:3000`. Ensure the olo backend is running on port **7080** for API calls (see `VITE_API_BASE` in `.env.development` and proxy in `vite.config.ts`).

## Build

```bash
npm run build
npm run preview
```

## Storybook (UI in isolation)

Develop and review UI components without running the backend or Redis:

```bash
npm run storybook
```

Stories for TenantConfigurationList, TenantConfigForm, and ToolsPanel use mock data. Add stories in `src/**/*.stories.tsx` for new components.

## Docs

- **[docs/README.md](docs/README.md)** — Overview, backend (olo on 7080), run instructions, project layout.
- **[docs/CHAT_UI.md](docs/CHAT_UI.md)** — Chat section: APIs used, UI behavior, run events, WebSocket liveness.
- **[src/store/README.md](src/store/README.md)** — Store discipline (one store per domain), current stores (ui, tenantConfig, runEvents), lifecycle.
