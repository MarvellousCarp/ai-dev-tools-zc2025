# Testing guide

This frontend workspace provides three categories of safety nets:

- **Quality gates**: linting and type-checking plus the production build to catch syntax/type errors that would break the UI.
- **Unit tests**: jsdom-based Vitest specs that exercise collaborative editor behavior.
- **Integration tests**: Node-based Vitest specs that start the collaboration server and verify real-time sync between multipl
e websocket clients.

## Commands
Run these from the repository root (`02-coding-interview/`):

```bash
npm run lint             # ESLint for the web workspace
npm run build            # TypeScript project references + Vite production build
npm --workspace web test # Vitest unit + integration tests under web/src/__tests__
```

## Coverage
- **Lint** verifies code style and detects obvious runtime blockers in the React client.
- **Build** ensures the TypeScript types and bundling configuration succeed for the shipped client.
- **Unit tests** (see `web/src/__tests__/components/CollaborativeEditor.test.tsx`) validate collaborator count updates and awareness cleanup in the shared editor.
- **Integration tests** (see `web/src/__tests__/integration/CollaborationServer.integration.test.ts`) spin up the Express/Yjs WebSocket server and assert both the `/health` endpoint and cross-client synchronization over real websockets.
