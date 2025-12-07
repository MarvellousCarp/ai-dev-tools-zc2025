# Docker guide

This project includes everything needed to build and run the coding interview platform with Docker.

## Images and services
- **Dockerfile** builds the front-end (Vite) and back-end (Express/WebSocket) in one image.
- **docker-compose.yml** runs a single `app` service that serves the compiled React app and the collaboration WebSocket API on port **3001**.

## Build the image
From the `02-coding-interview` directory:

```bash
docker compose build
```

> **Note:** The image uses the Debian-based `node:20-bookworm-slim` base to avoid Alpine musl compatibility issues with Rollup's optional native binaries. Builds that previously failed with `@rollup/rollup-linux-x64-musl` missing should now succeed without extra steps.

The build accepts an optional `VITE_COLLAB_ENDPOINT` build argument. Override it if the WebSocket endpoint differs from the default `ws://localhost:3001/collab`:

```bash
docker compose build --build-arg VITE_COLLAB_ENDPOINT=ws://example.com/collab
```

## Run the stack
Start the service and expose the application on `http://localhost:3001/`:

```bash
docker compose up
```

- Health check: `http://localhost:3001/health`
- WebSocket endpoint: `ws://localhost:3001/collab/{room}`

To stop the stack, press `Ctrl+C` or run:

```bash
docker compose down
```

## Run tests inside the container
Use the same image to execute the test suite:

```bash
docker compose run --rm app npm test
```

This command builds the image if needed, then runs the workspace test suite (build + Vitest) inside a disposable container.

## Environment configuration
Runtime variables you can override in `docker-compose.yml` or via `docker compose run -e`:

- `PORT` (default `3001`): HTTP port for the server and static assets.
- `WEBSOCKET_PATH` (default `/collab`): Path the collaboration WebSocket listens on.

For the front-end WebSocket URL, set `VITE_COLLAB_ENDPOINT` during `docker compose build` if you are proxying through a different host or path.
