import WS from 'ws';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import { createCollaborationServer } from '../../../../server/src/server';

type ServerInstance = ReturnType<typeof createCollaborationServer>;

async function waitForCondition(check: () => boolean, timeoutMs = 4000) {
  const start = Date.now();

  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(() => {
      if (check()) {
        clearInterval(interval);
        resolve();
        return;
      }

      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Condition not met within timeout'));
      }
    }, 25);
  });
}

describe('client + server integration', () => {
  let server: ServerInstance;
  let port: number;

  beforeAll(async () => {
    server = createCollaborationServer({ port: 0 });
    port = await server.listen();
  });

  afterAll(async () => {
    await server.close();
  });

  it('exposes a healthy REST endpoint', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/health`);

    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  it('syncs Yjs updates between multiple websocket clients', async () => {
    const room = 'integration-room';
    const websocketUrl = `ws://127.0.0.1:${port}${server.websocketPath}`;

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const providerA = new WebsocketProvider(websocketUrl, room, docA, {
      WebSocketPolyfill: WS,
    });
    const providerB = new WebsocketProvider(websocketUrl, room, docB, {
      WebSocketPolyfill: WS,
    });

    const textA = docA.getText('content');
    const textB = docB.getText('content');

    textA.insert(0, 'hello world');

    await waitForCondition(() => textB.toString() === 'hello world');

    providerA.destroy();
    providerB.destroy();
    docA.destroy();
    docB.destroy();
  });
});
