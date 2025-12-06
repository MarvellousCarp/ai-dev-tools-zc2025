# Sandboxed code runner

This client ships with a browser-only runner that executes code inside a sandboxed `<iframe>` with the `allow-scripts` flag and no network access.

## Supported languages
- **JavaScript**: executed directly in the iframe.
- **TypeScript**: transpiled in-browser to JavaScript before execution.
- **Python**: executed via [Pyodide](https://pyodide.org/) loaded on demand from the CDN (WebAssembly).
- **Java/C++**: collaboration-only in the editor; no runtime is shipped for them.

## Python prerequisites
- A modern browser with WebAssembly enabled (Pyodide uses WebAssembly under the hood).
- Network access to `https://cdn.jsdelivr.net/pyodide/v0.24.1/full/` to download the runtime and standard library (~10–15 MB compressed). The first Python run may take a few seconds while this initializes; subsequent runs reuse the loaded runtime.
- Sandbox remains offline: after loading, the Python code still executes without network access inside the iframe.

## How it works
1. Clicking **Run** creates a fresh hidden iframe whose `srcdoc` contains a tiny harness.
2. The harness overrides `console` methods to capture logs and errors, then posts them back to the host via `postMessage`.
3. For TypeScript, the client transpiles the snippet to modern JavaScript with `typescript.transpileModule` before sending it to the iframe.
4. For Python, the iframe lazy-loads Pyodide from the CDN, redirects `stdout`/`stderr` into in-memory buffers, and executes the user snippet with `pyodide.runPythonAsync`.
5. The runner times out if the sandbox does not respond, helping users diagnose blocked iframes or browser settings.
6. After a run completes, the output is written to a shared Yjs map so every participant in the room sees the same log history and timestamp.

## Notes on bundle size and performance
- Pyodide is loaded only when Python is selected to avoid inflating the initial page bundle.
- Expect an initial 10–15 MB download for Pyodide plus a few seconds of warm-up on the first Python run; later runs reuse the initialized interpreter.
- Java and C++ would require additional WebAssembly toolchains, so they remain collaboration-only to keep this demo lightweight.

## Sample snippets by language
Use these as quick sanity checks when switching the language dropdown:

- **JavaScript**
  ```js
  function greet(name) {
    return `Hello, ${name}!`;
  }

  console.log(greet('sandbox'));
  ```

- **TypeScript**
  ```ts
  type Point = { x: number; y: number };

  const distance = (a: Point, b: Point) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  };

  console.log('Distance from origin:', distance({ x: 0, y: 0 }, { x: 3, y: 4 }));
  ```

- **Python**
  ```py
  from collections import Counter

  words = "the quick brown fox jumps over the lazy dog".split()
  freq = Counter(words)
  print("Most common word:", freq.most_common(1)[0])
  ```

- **Java** (collaboration-only)
  ```java
  public class Interview {
      public static void main(String[] args) {
          System.out.println("Ready for collaboration!");
      }
  }
  ```

- **C++** (collaboration-only)
  ```cpp
  #include <bits/stdc++.h>
  using namespace std;

  int main() {
      vector<int> nums = {1, 1, 2, 3, 5, 8};
      cout << "Size: " << nums.size() << " first: " << nums.front() << endl;
      return 0;
  }
  ```

## Usage tips
- Keep snippets self-contained; the sandbox cannot reach external URLs or the parent DOM.
- Use `console.log` (JS/TS) or `print` (Python) to surface output. Errors are also captured and displayed in the output panel.
- If the sandbox fails to respond, retry or check for browser extensions that block iframes.
- The output area separates logs from the "Last run" timestamp to avoid embedded escape characters and keep the history readable.
