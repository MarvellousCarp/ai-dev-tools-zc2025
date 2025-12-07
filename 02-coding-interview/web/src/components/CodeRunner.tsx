import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { LanguageId } from './languageOptions';

const RUNNABLE_LANGUAGES: LanguageId[] = ['javascript', 'typescript', 'python'];

type RunResult = {
  output: string;
  timestamp: string;
};

type CodeRunnerProps = {
  code: string;
  language: LanguageId;
  roomId: string;
  websocketUrl: string;
};

const DEFAULT_RESULT: RunResult = {
  output:
    'Click “Run” to execute in a sandboxed iframe. JavaScript, TypeScript, and Python run fully in-browser; Java/C++ stay collaboration-only.',
  timestamp: '—',
};

const javascriptSandboxTemplate = `
<!doctype html>
<html>
  <body>
    <script>
      const logs = [];
      const send = (message) => parent.postMessage({ source: 'code-runner', payload: message }, '*');
      ['log', 'error', 'warn', 'info'].forEach((method) => {
        const original = console[method];
        console[method] = (...args) => {
          logs.push({ method, text: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') });
          original.apply(console, args);
        };
      });

      window.onerror = (msg, url, line, col) => {
        send({ type: 'error', text: msg, meta: { line, col, url } });
      };

      window.addEventListener('message', (event) => {
        if (!event.data || event.data.source !== 'host' || typeof event.data.code !== 'string') return;
        try {
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          const runnable = new AsyncFunction(event.data.code);
          runnable();
          send({ type: 'logs', logs });
        } catch (err) {
          send({ type: 'error', text: err?.message || String(err) });
        }
      });

      send({ type: 'ready' });
    </script>
  </body>
</html>
`;

const pythonSandboxTemplate = `
<!doctype html>
<html>
  <body>
    <script type="module">
      const send = (message) => parent.postMessage({ source: 'code-runner', payload: message }, '*');

      const pyodideReady = (async () => {
        try {
          const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.mjs');
          return await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
        } catch (err) {
          send({ type: 'error', text: err?.message ?? String(err) });
          throw err;
        }
      })();

      pyodideReady.then(() => send({ type: 'ready' })).catch(() => {});

      window.addEventListener('message', async (event) => {
        if (!event.data || event.data.source !== 'host' || typeof event.data.code !== 'string') return;
        try {
          const pyodide = await pyodideReady;
          const userCode = event.data.code;
          const pythonCode = [
            'import sys, io, traceback',
            'from contextlib import redirect_stdout, redirect_stderr',
            '',
            '_stdout, _stderr = io.StringIO(), io.StringIO()',
            'ns = {}',
            'code = ' + JSON.stringify(userCode),
            'try:',
            '    with redirect_stdout(_stdout), redirect_stderr(_stderr):',
            "        exec(compile(code, '<sandbox>', 'exec'), ns, ns)",
            'except Exception:',
            '    traceback.print_exc()',
            '__result__ = {"stdout": _stdout.getvalue(), "stderr": _stderr.getvalue()}',
            '',
            '__result__',
          ].join('\n');

          const execution = await pyodide.runPythonAsync(pythonCode);
          const plainResult =
            execution && typeof execution === 'object' && 'toJs' in execution
              ? // Convert the PyProxy/dict into a structured-cloneable plain object for postMessage.
                (execution as { toJs: (opts?: object) => unknown; destroy?: () => void }).toJs({
                  dict_converter: Object.fromEntries,
                })
              : execution;

          if (execution && typeof execution === 'object' && 'destroy' in execution) {
            (execution as { destroy: () => void }).destroy();
          }

          send({ type: 'python-result', result: plainResult });
        } catch (err) {
          send({ type: 'error', text: err?.message ?? String(err) });
        }
      });
    </script>
  </body>
</html>
`;

const sandboxTemplate = (language: LanguageId) =>
  language === 'python' ? pythonSandboxTemplate : javascriptSandboxTemplate;

export function CodeRunner({ code, language, roomId, websocketUrl }: CodeRunnerProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const readyTimeoutRef = useRef<number>();
  const runStateRef = useRef<Y.Map<RunResult>>();
  const [result, setResult] = useState<RunResult>(DEFAULT_RESULT);
  const runnable = useMemo(() => RUNNABLE_LANGUAGES.includes(language), [language]);

  const syncResultState = useCallback((next: RunResult) => {
    setResult(next);
    const stateMap = runStateRef.current;
    if (stateMap) {
      stateMap.set('result', next);
    }
  }, []);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(websocketUrl, roomId, ydoc, {
      connect: true,
    });
    const runMap = ydoc.getMap<RunResult>('runner');

    runStateRef.current = runMap;

    const hydrateFromSharedState = () => {
      const shared = runMap.get('result');
      if (shared) {
        setResult(shared);
      }
    };

    const observeSharedState = () => {
      hydrateFromSharedState();
    };

    runMap.observe(observeSharedState);
    provider.once('synced', () => {
      if (!runMap.has('result')) {
        runMap.set('result', DEFAULT_RESULT);
      }
      hydrateFromSharedState();
    });

    return () => {
      runMap.unobserve(observeSharedState);
      provider.destroy();
      ydoc.destroy();
      runStateRef.current = undefined;
    };
  }, [roomId, websocketUrl]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'code-runner') return;
      const { payload } = event.data;
      if (payload.type === 'error') {
        syncResultState({
          output: `⚠️ Error: ${payload.text}${payload.meta ? ` (line ${payload.meta.line})` : ''}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      if (payload.type === 'python-result') {
        const stdout = payload.result?.stdout ?? '';
        const stderr = payload.result?.stderr ?? '';
        const sections = [
          stdout ? `STDOUT:\n${stdout.trim()}` : '',
          stderr ? `STDERR:\n${stderr.trim()}` : '',
        ].filter(Boolean);
        syncResultState({
          output: sections.join('\n\n') || 'No output',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      if (payload.type === 'logs') {
        const formatted = payload.logs
          .map((entry: { method: string; text: string }) => `${entry.method.toUpperCase()}: ${entry.text}`)
          .join('\n');
        syncResultState({ output: formatted || 'No output', timestamp: new Date().toLocaleTimeString() });
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [syncResultState]);

  const run = async () => {
    if (!runnable) {
      syncResultState({
        output:
          'Browser-only execution is enabled for JavaScript, TypeScript, and Python. Java/C++ would need additional WebAssembly toolchains that are intentionally out of scope for this demo.',
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    syncResultState({
      output:
        language === 'python'
          ? 'Initializing Pyodide (downloads the Python runtime WebAssembly payload)…'
          : 'Running inside sandbox…',
      timestamp: new Date().toLocaleTimeString(),
    });

    if (frameRef.current) {
      frameRef.current.remove();
    }

    let source = code;
    if (language === 'typescript') {
      try {
        const ts = await import('typescript');
        source = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
      } catch (err) {
        syncResultState({
          output: `⚠️ Unable to transpile TypeScript: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date().toLocaleTimeString(),
        });
        return;
      }
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.srcdoc = sandboxTemplate(language);
    document.body.appendChild(iframe);
    frameRef.current = iframe;

    const postCode = () => {
      window.removeEventListener('message', readyListener);
      window.clearTimeout(readyTimeoutRef.current);
      iframe.contentWindow?.postMessage({ source: 'host', code: source, language }, '*');
    };

    const readyListener = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || !event.data || event.data.source !== 'code-runner') return;
      if (event.data.payload.type === 'ready') {
        postCode();
      }
    };

    window.addEventListener('message', readyListener);

    readyTimeoutRef.current = window.setTimeout(() => {
      syncResultState({
        output: '⚠️ The sandbox did not respond. Please try again or check your browser settings.',
        timestamp: new Date().toLocaleTimeString(),
      });
      window.removeEventListener('message', readyListener);
    }, language === 'python' ? 12000 : 2000);

    iframe.onload = () => {
      // If the iframe loads but the ready message is missed, still attempt to post code.
      postCode();
    };
  };

  return (
    <div className="runner-card">
      <div>
        <div className="card-title">Run code safely</div>
        <p className="helper">Executes inside a sandboxed iframe without server access.</p>
      </div>
      <button className="button" onClick={run}>Run ({language})</button>
      <div className="runner-log">
        <div className="runner-log-output">{result.output}</div>
        <div className="runner-log-timestamp">Last run: {result.timestamp}</div>
      </div>
    </div>
  );
}
