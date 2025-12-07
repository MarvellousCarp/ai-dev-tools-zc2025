# Coding Interview Platform

A real-time coding interview environment with collaborative editing, multi-language syntax highlighting, shareable rooms, and a sandboxed in-browser runner.

## Features
- **Shareable sessions**: Generate a unique link for each interview room and share it with candidates.
- **Live collaboration**: Everyone connected to the same room edits together through Yjs + WebSocket sync.
- **Syntax highlighting**: JavaScript, TypeScript, Python, Java, and C++ via CodeMirror 6.
- **Safe browser execution**: Run JavaScript/TypeScript snippets inside a sandboxed iframe—no server execution required. Other languages are editable for collaboration only because shipping WebAssembly runtimes (e.g., Pyodide is ~10–15 MB compressed plus a multi-second init) would bloat the demo bundle.
- **Shared output panel**: The latest run result is synced to everyone in the room so interviewers and candidates see the same logs.
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

### Run server and client together
Use the combined workspace script to launch both services in parallel (helpful for local development):
```bash
npm run dev
```
- Starts the collaboration server and the Vite dev server simultaneously in one terminal.

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
npm install                # install dependencies at the repo root
npm test                   # build + all Vitest suites (unit + integration)
npm --workspace web test   # runs only the Vitest suites in web/src/__tests__
npm run lint               # optional: ESLint for the web workspace
```

What they cover:
- **Build**: exercises the Vite/TypeScript build to surface issues that would prevent the app from rendering.
- **Lint** (optional): ensures the React code compiles without runtime-breaking type or syntax errors.
- **Unit tests**: jsdom-based Vitest specs that verify collaborative editor behavior, including participant counts and awareness cleanup.
- **Integration tests**: Node-based Vitest specs that boot the collaboration server and assert Yjs synchronization between WebSocket clients plus the `/health` endpoint.

If you see missing type-definition messages (for example, `vite/client` or React typings) during the build, delete any partial installs (`rm -rf node_modules package-lock.json`) and rerun `npm install` from the repo root so the workspace hoists common `@types/*` packages correctly.

## Docker usage (single container: server + web)
The `02-coding-interview` folder is self-contained for containerized runs. The new top-level `Dockerfile` builds both the server and the Vite client into one image that serves everything from port `3001`.

### 1) Build the image
```bash
docker compose build
```
- Uses the root `Dockerfile` to compile the client (into `web/dist`) and bundle it alongside the server build output.

### 2) Start the container
```bash
docker compose up -d
```
- Runs a single service on `http://localhost:3001` (health check at `/health`, WebSocket path `/collab`). The built client is served from the same container and domain.
- Logs: `docker compose logs -f`.

### 3) Visit the app
- Open `http://localhost:3001/` in a browser.
- A room ID is appended automatically; share the full URL to collaborate.

### 4) Stop and clean up
```bash
docker compose down
```
- Remove images too: `docker compose down --rmi local`.

### Customization
- Override ports or paths via `docker-compose.yml` environment variables, e.g. `PORT` or `WEBSOCKET_PATH`.
- To rebuild after code changes, rerun `docker compose build` and `docker compose up -d`.

### Troubleshooting installs
- Dependencies are pinned to published versions. `y-websocket` is locked to `1.5.4`, which is the newest 1.x release published to the npm registry, and `y-protocols` is pinned to `^1.0.6` to align with the Yjs 13 + y-protocols 1.x stack. Higher 1.5.x numbers (for example `1.5.10` or `1.5.12`) and newer majors (2.x/3.x) are not available on all mirrors and may also be incompatible with this dependency set. You can confirm what your registry exposes with `npm view y-websocket versions --json`.
- Ensure you run `npm install` from the workspace root so tools like `tsx` are installed for the server.

## Using the platform
1. Start the server and the client using the commands above (two terminals).
2. Open the Vite URL in your browser (e.g., `http://localhost:5173/`). You should see a code editor, language selector, and **Run** button.
3. A room ID is automatically appended to the URL (e.g., `http://localhost:5173/room/abc123`). Copy this full URL to invite another participant.
4. When another person opens the same URL, you should see their cursor and text changes live. Everyone in the room edits the same document.
5. Use the language dropdown to switch syntax highlighting between JavaScript, TypeScript, Python, Java, and C++.
6. Click **Run** to execute JavaScript/TypeScript snippets inside the sandboxed iframe. The output appears below the editor and stays in sync for everyone in the same room. Other languages are for collaboration only because shipping full WebAssembly runtimes (for instance, Pyodide is ~10–15 MB compressed before initialization) would bloat the demo bundle (see `web/docs/runner.md`).
7. Refreshing the page or sharing the link retains the document content for that room via the Yjs document synced through the collaboration server.

### Language quick templates
Use these snippets to sanity-check syntax highlighting or to share a consistent starting point during interviews. JavaScript/TypeScript run in-browser; the others are collaboration-only.

- **JavaScript**
  ```js
  const nums = [1, 2, 3, 4];
  const doubled = nums.map((n) => n * 2);
  console.log('Doubled array:', doubled);
  ```

- **TypeScript**
  ```ts
  type User = { name: string; active: boolean };

  const users: User[] = [
    { name: 'Asha', active: true },
    { name: 'Lee', active: false },
  ];

  const active = users.filter((u) => u.active).map((u) => u.name);
  console.log('Active users:', active.join(', '));
  ```

- **Python**
  ```py
  def reverse_words(sentence: str) -> str:
      return ' '.join(reversed(sentence.split()))

  print(reverse_words('pair programming is fun'))
  ```

- **Java**
  ```java
  public class Starter {
      public static void main(String[] args) {
          int sum = 0;
          for (int i = 1; i <= 5; i++) {
              sum += i;
          }
          System.out.println("Sum from 1 to 5: " + sum);
      }
  }
  ```

- **C++**
  ```cpp
  #include <bits/stdc++.h>
  using namespace std;

  int main() {
      vector<int> data = {3, 1, 4, 1, 5};
      sort(data.begin(), data.end());
      for (int n : data) cout << n << ' ';
      return 0;
  }
  ```

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
