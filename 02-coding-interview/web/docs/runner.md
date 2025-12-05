# Sandboxed code runner

This client ships with a browser-only runner that executes code inside a sandboxed `<iframe>` with the `allow-scripts` flag and no network access. JavaScript/TypeScript are transpiled and evaluated, Python uses Pyodide's WebAssembly runtime, and Java is transpiled to JavaScript for evaluation. C++ remains collaboration-only.

## Supported languages
- **JavaScript**: executed through the sandbox harness.
- **TypeScript**: transpiled in-browser to JavaScript before execution.
- **Python**: executed via Pyodide (loaded on-demand from its CDN) inside the sandboxed iframe.
- **Java**: transpiled to JavaScript for evaluation. Only console-style programs are supported.

C++ continues to be collaboration-only.

## How it works
1. Clicking **Run** creates a fresh hidden iframe whose `srcdoc` contains a tiny harness.
2. The harness overrides `console` methods to capture logs and errors, then posts them back to the host via `postMessage`.
3. For TypeScript, the client transpiles the snippet to modern JavaScript with `typescript.transpileModule` before sending it to the iframe.
4. The runner times out if the sandbox does not respond, helping users diagnose blocked iframes or browser settings.
5. After a run completes, the output is written to a shared Yjs map so every participant in the room sees the same log history and timestamp.

## Notes on the WebAssembly-backed runtimes
- **On-demand loading**: Pyodide is streamed from its CDN when the first Python snippet runs to keep the initial bundle small.
- **Transpilation trade-offs**: Java snippets are transpiled to JavaScript, so console-focused programs work best; more advanced JVM features remain out of scope for this demo.
- **Isolation**: Everything still executes inside the iframe sandbox to avoid leaking access to the host DOM or network.

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

- **Java**
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
