import { useEffect, useMemo, useRef, useState } from 'react';
import { LanguageId } from './CollaborativeEditor';

const RUNNABLE_LANGUAGES: LanguageId[] = ['javascript', 'typescript'];

type RunResult = {
  output: string;
  timestamp: string;
};

type CodeRunnerProps = {
  code: string;
  language: LanguageId;
};

const sandboxTemplate = `
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

      window.onerror = (msg, url, line, col, error) => {
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

export function CodeRunner({ code, language }: CodeRunnerProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [result, setResult] = useState<RunResult>({ output: 'Waiting to run…', timestamp: new Date().toLocaleTimeString() });
  const runnable = useMemo(() => RUNNABLE_LANGUAGES.includes(language), [language]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'code-runner') return;
      const { payload } = event.data;
      if (payload.type === 'error') {
        setResult({
          output: `⚠️ Error: ${payload.text}${payload.meta ? ` (line ${payload.meta.line})` : ''}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      if (payload.type === 'logs') {
        const formatted = payload.logs
          .map((entry: { method: string; text: string }) => `${entry.method.toUpperCase()}: ${entry.text}`)
          .join('\n');
        setResult({ output: formatted || 'No output', timestamp: new Date().toLocaleTimeString() });
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  const run = () => {
    if (!runnable) {
      setResult({
        output: 'In-browser execution is available for JavaScript and TypeScript. Use the live editor for other languages.',
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    if (frameRef.current) {
      frameRef.current.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    frameRef.current = iframe;

    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(sandboxTemplate);
    doc.close();

    const postCode = () => {
      iframe.contentWindow?.postMessage({ source: 'host', code }, '*');
    };

    const readyListener = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || !event.data || event.data.source !== 'code-runner') return;
      if (event.data.payload.type === 'ready') {
        postCode();
        window.removeEventListener('message', readyListener);
      }
    };

    window.addEventListener('message', readyListener);
  };

  return (
    <div className="runner-card">
      <div>
        <div className="card-title">Run code safely</div>
        <p className="helper">Executes inside a sandboxed iframe without server access.</p>
      </div>
      <button className="button" onClick={run}>Run ({language})</button>
      <div className="runner-log">{result.output}\n\nLast run: {result.timestamp}</div>
    </div>
  );
}
