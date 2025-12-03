import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const WEBSOCKET_PATH = process.env.WEBSOCKET_PATH || '/collab';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({
    message: 'Coding interview collaboration server running',
    websocketPath: WEBSOCKET_PATH,
  });
});

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

  if (!pathname.startsWith(WEBSOCKET_PATH)) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    const roomName = pathname.replace(`${WEBSOCKET_PATH}/`, '') || 'default';
    setupWSConnection(ws, request, { docName: roomName });
  });
});

wss.on('connection', () => {
  console.info('Client connected to collaboration server');
});

server.listen(PORT, () => {
  console.log(`Collaboration server listening on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint available at ws://localhost:${PORT}${WEBSOCKET_PATH}/{room}`);
});
