# Coding Interview Platform

A real-time coding interview environment with collaborative editing, multi-language syntax highlighting, shareable rooms, and a sandboxed in-browser runner.

## Features
- **Shareable sessions**: Generate a unique link for each interview room and share it with candidates.
- **Live collaboration**: Everyone connected to the same room edits together through Yjs + WebSocket sync.
- **Syntax highlighting**: JavaScript, TypeScript, Python, Java, and C++ via CodeMirror 6.
- **Safe browser execution**: Run JavaScript/TypeScript snippets inside a sandboxed iframe—no server execution required.
- **Separation of concerns**: Tiny Node.js collaboration server and a Vite + React front-end client.

## Project layout
```
02-coding-interview/
├── package.json          # Workspace scripts
├── server/               # Express + WebSocket collaboration service
└── web/                  # Vite + React client
```

## Prerequisites
- Node.js 18+
- npm 9+

## Getting started
Install all workspace dependencies (from the `02-coding-interview` folder):
```bash
npm install
```

### Run the collaboration server
Starts a small Express server that only handles collaboration (no code execution):
```bash
npm run dev:server
```
- Defaults: `PORT=3001`, `WEBSOCKET_PATH=/collab`.
- Health check: `GET http://localhost:3001/health`.
- Expected log: `Collaboration server listening on http://localhost:3001` and a WebSocket URL: `ws://localhost:3001/collab/{room}`.

### Run the web client
Serves the React/Vite application:
```bash
npm run dev:web
```
- Vite prints the URL to open (typically `http://localhost:5173/`).
- The client reads the WebSocket endpoint from `VITE_COLLAB_ENDPOINT` (defaults to `ws://localhost:3001/collab`).

If the browser shows a blank screen:
- Confirm dependencies are installed for all workspaces: `npm ci --workspaces --include-workspace-root`.
- Check the dev server console for build errors—fixing TypeScript/ESLint errors locally prevents silent failures in the browser.
- Verify the collaboration server is reachable at `http://localhost:3001/health` and that `VITE_COLLAB_ENDPOINT` matches `WEBSOCKET_PATH`.

### Build and lint
```bash
npm run build   # builds the web client
npm run lint    # lints the web client
```

### Tests
Lightweight checks to prevent regressions and catch blank-screen errors early:

```bash
npm test         # runs lint + build for the web workspace
```

What they cover:
- **Lint**: ensures the React code compiles without runtime-breaking type or syntax errors.
- **Build**: exercises the Vite/TypeScript build to surface issues that would prevent the app from rendering.

### Troubleshooting installs
- Dependencies are pinned to published versions. `y-websocket` is locked to `1.5.4`, which is the newest 1.x release published to the npm registry, and `y-protocols` is pinned to `^1.0.6` to align with the Yjs 13 + y-protocols 1.x stack. Higher 1.5.x numbers (for example `1.5.10` or `1.5.12`) and newer majors (2.x/3.x) are not available on all mirrors and may also be incompatible with this dependency set. You can confirm what your registry exposes with `npm view y-websocket versions --json`.
- Ensure you run `npm install` from the workspace root so tools like `tsx` are installed for the server.

## Using the platform
1. Start the server and the client using the commands above (two terminals).
2. Open the Vite URL in your browser (e.g., `http://localhost:5173/`). You should see a code editor, language selector, and **Run** button.
3. A room ID is automatically appended to the URL (e.g., `http://localhost:5173/room/abc123`). Copy this full URL to invite another participant.
4. When another person opens the same URL, you should see their cursor and text changes live. Everyone in the room edits the same document.
5. Use the language dropdown to switch syntax highlighting between JavaScript, TypeScript, Python, Java, and C++.
6. Click **Run** to execute JavaScript/TypeScript snippets inside the sandboxed iframe. The output appears below the editor. Other languages are for collaboration only.
7. Refreshing the page or sharing the link retains the document content for that room via the Yjs document synced through the collaboration server.

### Example session (what you should see)
- After starting both processes, visit the client URL. The editor will load with a default language (JavaScript) and a generated room URL.
- Paste a simple snippet and click **Run**:
  ```js
  // JavaScript example
  function add(a, b) { return a + b; }
  console.log('2 + 3 =', add(2, 3));
  ```
  The output panel should display `2 + 3 = 5`.
- Open the same room URL in another browser window or share it. You should see remote cursors and simultaneous text updates as you and the other participant type.

## Notes on safety
- Collaboration traffic is relay-only; source code never executes on the server.
- The runner uses a sandboxed iframe without network or DOM access to confine execution.
