import { useCallback, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { CollaborativeEditor, LanguageId } from './components/CollaborativeEditor';
import { CodeRunner } from './components/CodeRunner';
import './styles.css';

function getInitialRoom() {
  const url = new URL(window.location.href);
  const existing = url.searchParams.get('room');
  return existing ?? uuid();
}

export default function App() {
  const [roomId, setRoomId] = useState<string>(getInitialRoom);
  const [language, setLanguage] = useState<LanguageId>('javascript');
  const [code, setCode] = useState('');

  const websocketUrl = useMemo(() => import.meta.env.VITE_COLLAB_ENDPOINT ?? 'ws://localhost:3001/collab', []);
  const shareLink = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    return url.toString();
  }, [roomId]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    alert('Link copied to clipboard');
  };

  const createNewSession = () => {
    const newRoom = uuid();
    setRoomId(newRoom);
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    window.history.replaceState({}, '', url.toString());
  };

  const onContentChange = useCallback((content: string) => setCode(content), []);

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <h1>Realtime Coding Interview Platform</h1>
          <p>Share a link, edit together, and run code in a sandboxed environment.</p>
          <div className="badge-row">
            <span className="badge">Live collaboration</span>
            <span className="badge">Multi-language syntax</span>
            <span className="badge">In-browser runner</span>
          </div>
        </div>
        <div className="controls">
          <select
            className="field"
            value={language}
            onChange={(event) => setLanguage(event.target.value as LanguageId)}
            aria-label="Select language"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
          <button className="button" onClick={createNewSession}>
            New session
          </button>
        </div>
      </header>

      <section className="controls">
        <div style={{ flex: 1 }}>
          <div className="small-label">Shareable link</div>
          <input className="field" value={shareLink} readOnly />
        </div>
        <button className="button secondary" onClick={copyLink}>
          Copy link
        </button>
      </section>

      <div className="layout">
        <CollaborativeEditor
          roomId={roomId}
          websocketUrl={websocketUrl}
          language={language}
          onContentChange={onContentChange}
        />
        <CodeRunner code={code} language={language} />
      </div>

      <section>
        <h3>How it works</h3>
        <ul>
          <li>Create or reuse the shareable link to invite candidates.</li>
          <li>Everyone in the same room edits the document in real time.</li>
          <li>Syntax highlighting adapts to your chosen language.</li>
          <li>Run JavaScript/TypeScript snippets safely inside the browser sandbox.</li>
          <li>The backend only relays collaborative edits; no code leaves the browser for execution.</li>
        </ul>
      </section>
    </div>
  );
}
