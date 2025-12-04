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
```bash
npm run dev:server
```
- Defaults: `PORT=3001`, `WEBSOCKET_PATH=/collab`.
- Health check: `GET http://localhost:3001/health`.

### Run the web client
In a separate terminal:
```bash
npm run dev:web
```
The client reads the WebSocket endpoint from `VITE_COLLAB_ENDPOINT` (defaults to `ws://localhost:3001/collab`).

### Build and lint
```bash
npm run build   # builds the web client
npm run lint    # lints the web client
```

### Troubleshooting installs
- Dependencies are pinned to published versions; `y-websocket` is pinned to `1.5.11` to avoid unavailable tags.
- Ensure you run `npm install` from the workspace root so tools like `tsx` are installed for the server.

## Using the platform
1. Start the server and the client.
2. Open the client in your browser. A session ID is generated automatically and reflected in the URL.
3. Copy the shareable link and send it to a candidate—everyone in the same room edits the same document.
4. Switch languages to adjust syntax highlighting.
5. Run JavaScript/TypeScript snippets safely in-browser via the "Run" button. Other languages are collaborative-only.

## Notes on safety
- Collaboration traffic is relay-only; source code never executes on the server.
- The runner uses a sandboxed iframe without network or DOM access to confine execution.
