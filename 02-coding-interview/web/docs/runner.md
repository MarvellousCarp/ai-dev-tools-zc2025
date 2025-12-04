# Sandboxed code runner

This client ships with a browser-only runner that executes code inside a sandboxed `<iframe>` with the `allow-scripts` flag and no network access.

## Supported languages
- **JavaScript**: executed directly in the iframe.
- **TypeScript**: transpiled in-browser to JavaScript before execution.

Other languages in the editor dropdown (Python, Java, C++) are not executed in the browser because embedding full runtimes (for example, Pyodide or LLVM toolchains compiled to WebAssembly) would significantly increase bundle size and loading time for the demo. Pyodide alone adds roughly 10–15 MB compressed **plus** a multi-second initialization that downloads standard-library files into the browser before a snippet can run. For this lightweight demo we keep those runtimes out of the bundle so the page loads fast and stays offline-friendly.

## How it works
1. Clicking **Run** creates a fresh hidden iframe whose `srcdoc` contains a tiny harness.
2. The harness overrides `console` methods to capture logs and errors, then posts them back to the host via `postMessage`.
3. For TypeScript, the client transpiles the snippet to modern JavaScript with `typescript.transpileModule` before sending it to the iframe.
4. The runner times out if the sandbox does not respond, helping users diagnose blocked iframes or browser settings.
5. After a run completes, the output is written to a shared Yjs map so every participant in the room sees the same log history and timestamp.

## Why we haven’t inlined Python/Java/C++ yet
- **Runtime + stdlib weight**: Even with compression, Pyodide + its standard library adds 10–15 MB and unpacks to tens of megabytes in memory. Java/C++ toolchains compiled to WebAssembly are similar or heavier.
- **Initialization latency**: Loading the runtime, mounting a virtual filesystem, and warming up the interpreter typically takes a few seconds before the first line of user code executes. That hurts the “instant try-it” experience we want for this demo.
- **Build/tooling changes**: Shipping Pyodide requires async bootstrapping code, service-worker caching, and tighter sandboxing policies for the virtual FS. Adding LLVM-based toolchains for Java/C++ would also bloat the Vite build and slow down hot-module reload.
- **Security surface**: More complex runtimes mean larger attack surfaces and more knobs to secure (filesystem APIs, networking inhibitions, WASM capabilities). Keeping the iframe JavaScript-only dramatically reduces this risk.

If you need in-browser Python, the recommended approach is to load Pyodide from its CDN on-demand, cache it with a service worker, and stream code through `pyodide.runPythonAsync`. That work is feasible but intentionally out-of-scope for this minimal demo to keep the bundle small and easy to self-host.

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

- **Python** (collaboration-only)
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
- Use `console.log` to surface output. Errors are also captured and displayed in the output panel.
- If the sandbox fails to respond, retry or check for browser extensions that block iframes.
- The output area separates logs from the "Last run" timestamp to avoid embedded escape characters and keep the history readable.
