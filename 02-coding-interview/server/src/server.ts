import express from 'express';
import { AddressInfo } from 'net';
import { createServer, type Server } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

type CollaborationServerOptions = {
  port?: number;
  websocketPath?: string;
};

export function createCollaborationServer(options: CollaborationServerOptions = {}) {
  const port =
    options.port ?? (process.env.PORT ? Number(process.env.PORT) : 3001);
  const websocketPath = options.websocketPath ?? process.env.WEBSOCKET_PATH ?? '/collab';

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/', (_req, res) => {
    res.json({
      message: 'Coding interview collaboration server running',
      websocketPath,
    });
  });

  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

    if (!pathname.startsWith(websocketPath)) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const roomName = pathname.replace(`${websocketPath}/`, '') || 'default';
      setupWSConnection(ws, request, { docName: roomName });
    });
  });

  wss.on('connection', () => {
    console.info('Client connected to collaboration server');
  });

  const listen = () =>
    new Promise<number>((resolve) => {
      server.listen(port, () => {
        const address = server.address() as AddressInfo;
        const listeningPort = address.port;
        console.log(
          `Collaboration server listening on http://localhost:${listeningPort}`
        );
        console.log(
          `WebSocket endpoint available at ws://localhost:${listeningPort}${websocketPath}/{room}`
        );
        resolve(listeningPort);
      });
    });

  const close = () =>
    new Promise<void>((resolve, reject) => {
      wss.clients.forEach((client) => client.close());
      wss.close((closeErr) => {
        if (closeErr) {
          reject(closeErr);
          return;
        }

        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });

  return {
    app,
    server,
    wss,
    websocketPath,
    listen,
    close,
  } satisfies {
    app: ReturnType<typeof express>;
    server: Server;
    wss: WebSocketServer;
    websocketPath: string;
    listen: () => Promise<number>;
    close: () => Promise<void>;
  };
}

if (require.main === module) {
  const instance = createCollaborationServer();
  instance.listen();
}
