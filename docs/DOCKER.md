# Docker for olo-chat (frontend)

This document describes how to build and run the olo-chat frontend as a Docker container, including all environment variable definitions and GitHub Actions setup.

## Overview

- **Dockerfile**: Multi-stage build (Node for building the Vite app, then Nginx to serve static files).
- **Environment variables**: All `VITE_*` values are **baked in at build time** by Vite. You pass them as Docker build args when building the image.
- **GitHub Actions**: Workflow builds the image on push to `main`/`master` and can push to GitHub Container Registry (ghcr.io).

---

## Environment variable definitions

These are the only environment variables the frontend uses. They must be set at **build time** (Docker build args or CI variables).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **VITE_API_BASE** | Yes (for API/WS) | `http://localhost:7080` | Base URL of the olo backend. The app will call `{VITE_API_BASE}/api` for REST and `ws://...` derived from this for WebSocket. No trailing slash. Examples: `http://localhost:7080`, `https://api.example.com`. |
| **VITE_WS_ACCESS_TOKEN** | No | _(empty)_ | Optional WebSocket access token. If set, it is used when the app has no token in `sessionStorage` (e.g. before login). Prefer setting the token at runtime via login and `sessionStorage.accessToken`. |
| **VITE_WS_PING_INTERVAL_SEC** | No | `10` | WebSocket ping interval (and reconnect delay) in seconds. Used for liveness checks. |

### Notes

- **CORS**: The backend must allow requests from the origin where the frontend is served (e.g. the domain or port of the Docker host).
- **Build-time only**: Vite replaces `import.meta.env.VITE_*` during `vite build`. To change these values you must rebuild the image with new build args.

---

## Building the Docker image locally

### With defaults (backend at `http://localhost:7080`)

```bash
docker build -t olo-chat .
```

### With custom backend URL (and optional env)

```bash
docker build -t olo-chat \
  --build-arg VITE_API_BASE=https://api.myolo.com \
  --build-arg VITE_WS_PING_INTERVAL_SEC=15 \
  .
```

### With WebSocket token (optional, usually not needed for production)

```bash
docker build -t olo-chat \
  --build-arg VITE_API_BASE=https://api.myolo.com \
  --build-arg VITE_WS_ACCESS_TOKEN=your-token \
  .
```

---

## Running the container

The image serves the app on **port 80** inside the container.

### Map port to host (e.g. 3000)

```bash
docker run -p 3000:80 olo-chat
```

Open `http://localhost:3000`.

### Example with name and restart policy

```bash
docker run -d --name olo-chat-ui -p 3000:80 --restart unless-stopped olo-chat
```

---

## GitHub Actions: build and push

### Trigger

- **Push** to branches `main` or `master`: workflow runs and builds the image. If the branch is `main`/`master`, it also pushes to GitHub Container Registry (ghcr.io).
- **Manual**: Run the workflow from the **Actions** tab (**Build and push Docker image** → **Run workflow**). You can add an input later to control whether to push.

### Where to set build configuration

- **Repository variables** (Settings → Secrets and variables → Actions → Variables):
  - **VITE_API_BASE**: Backend base URL used at build time (e.g. `https://api.myolo.com`). If not set, defaults to `http://localhost:7080`.
  - **VITE_WS_PING_INTERVAL_SEC**: Optional; default `10`.
- **Repository secrets** (Settings → Secrets and variables → Actions → Secrets):
  - **VITE_WS_ACCESS_TOKEN**: Optional; only if you want a token baked in for WebSocket (usually leave unset).

### Image location and tags

- Image: `ghcr.io/<owner>/<repo>` (e.g. `ghcr.io/myorg/olo-chat`).
- Tags: branch name, Git SHA, and `latest` (only for `main`/`master`).

### Pull and run (after workflow has run)

```bash
docker pull ghcr.io/<owner>/<repo>:latest
docker run -p 3000:80 ghcr.io/<owner>/<repo>:latest
```

For a private repo, create a PAT with `read:packages` and:

```bash
echo <PAT> | docker login ghcr.io -u <user> --password-stdin
```

---

## File reference

| File | Purpose |
|------|---------|
| **Dockerfile** | Multi-stage build: Node build, then Nginx serving `dist`. |
| **nginx.conf** | Nginx config: SPA fallback to `index.html`, static asset caching. |
| **.dockerignore** | Excludes `node_modules`, `dist`, `.git`, env files, tests, etc. |
| **.github/workflows/docker-build.yml** | Builds and (on main/master) pushes the image to ghcr.io. |

---

## Troubleshooting

- **Blank page or wrong API URL**: Rebuild the image with the correct `VITE_API_BASE` for the environment where the app is served.
- **CORS errors**: Configure the olo backend to allow the origin of the frontend (scheme + host + port).
- **WebSocket fails**: Ensure `VITE_API_BASE` uses the same host/port the browser should use for WebSocket (e.g. `wss://` in production). The app derives the WebSocket URL from `VITE_API_BASE`.
