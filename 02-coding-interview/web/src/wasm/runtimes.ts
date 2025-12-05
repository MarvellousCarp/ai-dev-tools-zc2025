import { LanguageId } from '../components/languageOptions';

type RuntimeResult = {
  output: string;
};

export type WasmRuntime = {
  language: LanguageId;
  run: (code: string) => Promise<RuntimeResult>;
};

const iframeSandboxTemplate = `
<!doctype html>
<html>
  <body>
    <script>
      const send = (message) => parent.postMessage({ source: 'wasm-proxy', payload: message }, '*');

      window.onerror = (msg, url, line, col) => {
        send({ type: 'error', text: msg, meta: { line, col, url } });
      };

      window.addEventListener('message', async (event) => {
        if (!event.data || event.data.source !== 'host' || typeof event.data.code !== 'string') return;
        const { language, code } = event.data;
        try {
          if (language === 'python') {
            const { output } = await runPython(code);
            send({ type: 'logs', text: output });
            return;
          }
          if (language === 'java') {
            const transpiled = transpileJavaToJs(code);
            const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
            await new AsyncFunction(transpiled)();
            send({ type: 'logs', text: 'Program finished without errors.' });
            return;
          }
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          const runnable = new AsyncFunction(code);
          await runnable();
          send({ type: 'logs', text: 'Program finished without errors.' });
        } catch (err) {
          send({ type: 'error', text: err?.message || String(err) });
        }
      });

      async function ensurePyodide() {
        // @ts-ignore - loaded dynamically in the sandbox
        if (window.pyodide) return window.pyodide;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.mjs');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return window.pyodide;
      }

      async function runPython(code) {
        const pyodide = await ensurePyodide();
        const results = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
          results.push(args.map(String).join(' '));
          originalConsoleLog.apply(console, args);
        };
        try {
          await pyodide.runPythonAsync(code);
          return { output: results.join('\n') || 'No output' };
        } finally {
          console.log = originalConsoleLog;
        }
      }

      function transpileJavaToJs(code) {
        const withoutImports = code.replace(/import[^;]+;\s*/g, '');
        const mainMatch = /class\s+\w+\s*\{([\s\S]*)\}/m.exec(withoutImports);
        const body = mainMatch ? mainMatch[1] : withoutImports;
        const withoutMain = body.replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{([\s\S]*)\}/m, '$1');
        return withoutMain
          .replace(/System\.out\.println/g, 'console.log')
          .replace(/System\.out\.print/g, 'console.log');
      }

      send({ type: 'ready' });
    </script>
  </body>
</html>
`;

async function runInIframe(code: string, language: LanguageId): Promise<RuntimeResult> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.srcdoc = iframeSandboxTemplate;
    
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      iframe.remove();
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Sandbox did not respond in time'));
    }, 8000);

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'wasm-proxy') return;
      // Some browsers set event.source to null for sandboxed iframes without
      // allow-same-origin. Rely on the message marker instead of the source
      // window reference so we don't drop the ready/error notifications.

      const payload = event.data.payload;
        if (payload.type === 'ready') {
          iframe.contentWindow?.postMessage({ source: 'host', language, code }, '*');
          return;
        }
      if (payload.type === 'logs') {
        cleanup();
        resolve({ output: payload.text });
        return;
      }
      if (payload.type === 'error') {
        cleanup();
        reject(new Error(payload.text));
      }
    };

    // Attach listener before injecting the iframe into the DOM to avoid missing the initial "ready" message.
    window.addEventListener('message', handleMessage);
    document.body.appendChild(iframe);
  });
}

async function runJavascript(code: string): Promise<RuntimeResult> {
  return runInIframe(code, 'javascript');
}

async function runTypescript(code: string): Promise<RuntimeResult> {
  const ts = await import('typescript');
  const transpiled = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return runInIframe(transpiled, 'javascript');
}

async function runPython(code: string): Promise<RuntimeResult> {
  return runInIframe(code, 'python');
}

async function runJava(code: string): Promise<RuntimeResult> {
  return runInIframe(code, 'java');
}

export async function getWasmRuntime(language: LanguageId): Promise<WasmRuntime> {
  switch (language) {
    case 'javascript':
      return { language, run: runJavascript };
    case 'typescript':
      return { language, run: runTypescript };
    case 'python':
      return { language, run: runPython };
    case 'java':
      return { language, run: runJava };
    default:
      throw new Error('Unsupported language for WASM runtime');
  }
}
