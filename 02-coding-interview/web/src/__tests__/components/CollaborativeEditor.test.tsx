import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CollaborativeEditor } from '../../components/CollaborativeEditor';

afterEach(() => {
  cleanup();
});

vi.mock('@uiw/react-codemirror', () => ({
  __esModule: true,
  default: () => <div data-testid="codemirror" />,
  ReactCodeMirrorRef: {},
}));

vi.mock('@codemirror/lang-javascript', () => ({
  javascript: () => ({}),
}));

vi.mock('@codemirror/lang-python', () => ({
  python: () => ({}),
}));

vi.mock('@codemirror/lang-cpp', () => ({
  cpp: () => ({}),
}));

vi.mock('@codemirror/lang-java', () => ({
  java: () => ({}),
}));

vi.mock('y-codemirror.next', () => ({
  yCollab: () => ({}),
}));

type AwarenessChangeHandler = () => void;

class AwarenessMock {
  public lastLocalState: unknown = undefined;
  private readonly states = new Map<string, unknown>();
  private readonly changeHandlers = new Set<AwarenessChangeHandler>();

  getStates() {
    return this.states;
  }

  setLocalState(state: unknown) {
    this.lastLocalState = state;

    if (state === null) {
      this.states.delete('local');
    } else {
      this.states.set('local', state);
    }

    this.emitChange();
  }

  addRemote(id: string, state: unknown = {}) {
    this.states.set(id, state);
    this.emitChange();
  }

  removeRemote(id: string) {
    this.states.delete(id);
    this.emitChange();
  }

  on(event: 'change', handler: AwarenessChangeHandler) {
    if (event === 'change') {
      this.changeHandlers.add(handler);
    }
  }

  off(event: 'change', handler: AwarenessChangeHandler) {
    if (event === 'change') {
      this.changeHandlers.delete(handler);
    }
  }

  private emitChange() {
    this.changeHandlers.forEach((handler) => handler());
  }
}

type StatusHandler = (event: { status: string }) => void;
type SyncedHandler = (synced: boolean) => void;

class WebsocketProviderMock {
  public awareness = new AwarenessMock();
  public readonly statusHandlers = new Set<StatusHandler>();
  public readonly syncedHandlers = new Set<SyncedHandler>();
  public destroyed = false;

  constructor() {
    websocketMock.instances.add(this);
  }

  on(event: 'status', handler: StatusHandler) {
    if (event === 'status') {
      this.statusHandlers.add(handler);
    }
  }

  once(event: 'synced', handler: SyncedHandler) {
    if (event === 'synced') {
      this.syncedHandlers.add(handler);
    }
  }

  off(event: 'status', handler: StatusHandler) {
    if (event === 'status') {
      this.statusHandlers.delete(handler);
    }
  }

  destroy() {
    this.destroyed = true;
  }

  emitStatus(status: string) {
    this.statusHandlers.forEach((handler) => handler({ status }));
  }

  emitSynced(synced: boolean) {
    this.syncedHandlers.forEach((handler) => handler(synced));
    this.syncedHandlers.clear();
  }
}

const websocketMock = { instances: new Set<WebsocketProviderMock>() };

vi.mock('y-websocket', () => ({
  __esModule: true,
  WebsocketProvider: WebsocketProviderMock,
  __mock: websocketMock,
}));

describe('CollaborativeEditor participants', () => {
  const defaultProps = {
    roomId: 'room-123',
    websocketUrl: 'ws://localhost:1234',
    language: 'javascript' as const,
    onContentChange: vi.fn(),
  };

  it('updates the participant count when remote collaborators join or leave', async () => {
    render(<CollaborativeEditor {...defaultProps} />);

    const [provider] = websocketMock.instances;

    await waitFor(() => {
      expect(screen.getByText('1 participant(s)')).toBeTruthy();
    });

    provider.awareness.addRemote('peer-1');

    await waitFor(() => {
      expect(screen.getByText('2 participant(s)')).toBeTruthy();
    });

    provider.awareness.removeRemote('peer-1');

    await waitFor(() => {
      expect(screen.getByText('1 participant(s)')).toBeTruthy();
    });
  });

  it('clears the local awareness state on unmount to avoid ghost participants', async () => {
    const { unmount } = render(<CollaborativeEditor {...defaultProps} />);

    const [provider] = websocketMock.instances;

    provider.awareness.addRemote('peer-1');

    await waitFor(() => {
      expect(screen.getByText('2 participant(s)')).toBeTruthy();
    });

    unmount();

    expect(provider.awareness.getStates().size).toBe(1);
    expect(provider.awareness.getStates().has('local')).toBe(false);
    expect(provider.awareness.lastLocalState).toBeNull();
  });
});
