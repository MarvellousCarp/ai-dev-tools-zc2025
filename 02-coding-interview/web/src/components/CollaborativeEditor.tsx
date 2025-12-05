import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type { Extension } from '@codemirror/state';
import { useEffect, useMemo, useRef, useState } from 'react';
import { yCollab } from 'y-codemirror.next';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import type { LanguageId } from './languageOptions';
import { getLanguageOption } from './languageOptions';

export type CollaborativeEditorProps = {
  roomId: string;
  websocketUrl: string;
  language: LanguageId;
  onContentChange: (content: string) => void;
};

export function CollaborativeEditor({
  roomId,
  websocketUrl,
  language,
  onContentChange,
}: CollaborativeEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState(1);
  const [collabExtensions, setCollabExtensions] = useState<Extension[]>([]);
  const ydocRef = useRef<Y.Doc>();
  const yTextRef = useRef<Y.Text>();
  const providerRef = useRef<WebsocketProvider>();
  const languageConfig = getLanguageOption(language);

  const extensions = useMemo<Extension[]>(() => {
    const langExtension = languageConfig.extension();
    return [langExtension, ...collabExtensions];
  }, [languageConfig, collabExtensions]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(websocketUrl, roomId, ydoc, {
      connect: true,
    });
    const yText = ydoc.getText('codemirror');

    ydocRef.current = ydoc;
    yTextRef.current = yText;
    providerRef.current = provider;

    // Hide remote cursors by omitting awareness from the yCollab binding while still
    // keeping document sync and undo/redo support intact.
    setCollabExtensions([yCollab(yText, undefined)]);

    const statusListener = ({ status }: { status: string }) => {
      setConnected(status === 'connected');
    };

    const awareness = provider.awareness;
    awareness.setLocalState({});
    const updateCollaborators = () => setCollaborators(Math.max(awareness.getStates().size, 1));

    provider.on('status', statusListener);
    awareness.on('change', updateCollaborators);

    const broadcastContent = () => onContentChange(yText.toString());
    yText.observe(broadcastContent);

    const hydrateSampleOnceSynced = (isSynced: boolean) => {
      if (!isSynced) return;

      if (yText.length === 0) {
        yText.insert(0, languageConfig.sample);
      } else {
        broadcastContent();
      }
    };

    provider.once('synced', hydrateSampleOnceSynced);

    updateCollaborators();

    return () => {
      provider.off('status', statusListener);
      awareness.off('change', updateCollaborators);
      yText.unobserve(broadcastContent);
      awareness.setLocalState(null);
      provider.destroy();
      ydoc.destroy();
      setCollabExtensions([]);
    };
  }, [roomId, websocketUrl, onContentChange, languageConfig.sample, languageConfig.id]);

  return (
    <div className="editor-card">
      <div className="editor-topbar">
        <div>
          <span className="status-dot" aria-hidden />
          {connected ? 'Live collaboration enabled' : 'Connecting…'}
        </div>
        <div className="small-label">{collaborators} participant(s)</div>
      </div>
      <CodeMirror
        ref={editorRef}
        theme="dark"
        height="500px"
        extensions={extensions}
        basicSetup={{ lineNumbers: true, foldGutter: true, bracketMatching: true }}
        editable
      />
    </div>
  );
}
