import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type { Extension } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript, typescript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { useEffect, useMemo, useRef, useState } from 'react';
import { yCollab } from 'y-codemirror.next';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

export type LanguageId = 'javascript' | 'typescript' | 'python' | 'cpp' | 'java';

export type LanguageOption = {
  id: LanguageId;
  label: string;
  sample: string;
  extension: () => Extension;
};

const languageOptions: Record<LanguageId, LanguageOption> = {
  javascript: {
    id: 'javascript',
    label: 'JavaScript',
    sample: `// Write JavaScript here\nfunction sum(a, b) {\n  return a + b;\n}\n\nconsole.log('Ready to interview!');\nconsole.log('2 + 2 =', sum(2, 2));`,
    extension: () => javascript({ jsx: true, typescript: true }),
  },
  typescript: {
    id: 'typescript',
    label: 'TypeScript',
    sample: `// TypeScript example
type Candidate = { name: string; years: number };

const applicant: Candidate = { name: 'Alex', years: 5 };

const format = (candidate: Candidate) => candidate.name + ' (' + candidate.years + 'y)';
console.log('Candidate:', format(applicant));`,
    extension: () => typescript({ jsx: true, typescript: true }),
  },

  python: {
    id: 'python',
    label: 'Python',
    sample: '# Python sample\n\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint("fib(10)=", fib(10))',
    extension: () => python(),
  },
  cpp: {
    id: 'cpp',
    label: 'C++',
    sample: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "Hello, interviewer!" << endl;\n    return 0;\n}',
    extension: () => cpp(),
  },
  java: {
    id: 'java',
    label: 'Java',
    sample: 'public class Interview {\n  public static void main(String[] args) {\n    System.out.println("Pair up and code!");\n  }\n}',
    extension: () => java(),
  },
};

export function getLanguageOption(languageId: LanguageId): LanguageOption {
  return languageOptions[languageId];
}

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
  const ydocRef = useRef<Y.Doc>();
  const yTextRef = useRef<Y.Text>();
  const providerRef = useRef<WebsocketProvider>();
  const languageConfig = getLanguageOption(language);

  const extensions = useMemo(() => {
    const collab = yTextRef.current
      ? [yCollab(yTextRef.current, providerRef.current?.awareness)]
      : [];
    const langExtension = languageConfig.extension();
    return [langExtension, ...collab];
  }, [languageConfig]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(websocketUrl, roomId, ydoc, {
      connect: true,
    });
    const yText = ydoc.getText('codemirror');

    ydocRef.current = ydoc;
    yTextRef.current = yText;
    providerRef.current = provider;

    const statusListener = ({ status }: { status: string }) => {
      setConnected(status === 'connected');
    };

    const awareness = provider.awareness;
    const updateCollaborators = () => setCollaborators(Math.max(awareness.getStates().size, 1));

    provider.on('status', statusListener);
    awareness.on('change', updateCollaborators);

    const broadcastContent = () => onContentChange(yText.toString());
    yText.observe(broadcastContent);

    if (yText.length === 0) {
      yText.insert(0, languageConfig.sample);
    } else {
      broadcastContent();
    }

    updateCollaborators();

    return () => {
      provider.off('status', statusListener);
      awareness.off('change', updateCollaborators);
      yText.unobserve(broadcastContent);
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId, websocketUrl, onContentChange, languageConfig.sample, languageConfig.id]);

  useEffect(() => {
    const yText = yTextRef.current;
    if (yText && yText.length === 0) {
      yText.insert(0, languageConfig.sample);
    }
  }, [languageConfig.sample]);

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
        extensions={extensions as never}
        basicSetup={{ lineNumbers: true, foldGutter: true, bracketMatching: true }}
        editable
      />
    </div>
  );
}
