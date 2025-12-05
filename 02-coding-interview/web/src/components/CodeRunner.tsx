import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { LanguageId } from './languageOptions';
import { getWasmRuntime, type WasmRuntime } from '../wasm/runtimes';

const RUNNABLE_LANGUAGES: LanguageId[] = ['javascript', 'typescript', 'python', 'java'];

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
    'Click “Run” to execute locally via WebAssembly sandboxes. JavaScript/TypeScript run after transpilation, Python uses Pyodide, Java transpiles to JS, and C++ stays collaboration-only.',
  timestamp: '—',
};

export function CodeRunner({ code, language, roomId, websocketUrl }: CodeRunnerProps) {
  const runStateRef = useRef<Y.Map<RunResult>>();
  const [result, setResult] = useState<RunResult>(DEFAULT_RESULT);
  const runnable = useMemo(() => RUNNABLE_LANGUAGES.includes(language), [language]);
  const runtimeRef = useRef<WasmRuntime | null>(null);

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

  const run = async () => {
    if (!runnable) {
      syncResultState({
        output: 'C++ remains collaboration-only. Other languages run inside browser-only WebAssembly sandboxes.',
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    syncResultState({ output: 'Running inside sandbox…', timestamp: new Date().toLocaleTimeString() });
    try {
      if (!runtimeRef.current || runtimeRef.current.language !== language) {
        runtimeRef.current = await getWasmRuntime(language);
      }

      const runtime = runtimeRef.current;
      const outcome = await runtime.run(code);

      syncResultState({
        output: outcome.output,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      syncResultState({
        output: `⚠️ Unable to run snippet: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
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
