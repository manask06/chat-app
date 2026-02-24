import path from "path";
import http from "http";
import { randomUUID } from "crypto";
import express, { type Request, type Response } from "express";
import { WebSocketServer, type WebSocket } from "ws";
import {
  MESSAGE_TYPES,
  type ClientEvent,
  type ServerEvent,
  isClientEvent,
  safeParse,
  sanitizeText
} from "../shared/protocol";
import { createStateStore } from "./state";

type HealthResponse = {
  status: "ok";
  service: "chat-app";
  app: "realtime-chat";
};

const port = Number(process.env.PORT ?? 3000);
const app = express();
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server });
const store = createStateStore();

const clientDir = path.join(process.cwd(), "src/client");
app.use(express.static(clientDir));

app.get("/health", (_req: Request, res: Response<HealthResponse>) => {
  res.json({ status: "ok", service: "chat-app", app: "realtime-chat" });
});

function sendToClient(socket: WebSocket, payload: ServerEvent): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(payload: ServerEvent): void {
  const rawPayload = JSON.stringify(payload);
  wsServer.clients.forEach((clientSocket) => {
    if (clientSocket.readyState === clientSocket.OPEN) {
      clientSocket.send(rawPayload);
    }
  });
}

function buildPresence(): ServerEvent {
  const users: string[] = [];
  store.getClients().forEach((client) => {
    if (client.name) users.push(client.name);
  });
  users.sort((a, b) => a.localeCompare(b));
  return { type: MESSAGE_TYPES.PRESENCE, users };
}

function usernameExists(name: string): boolean {
  const normalized = name.toLowerCase();
  for (const [, client] of store.getClients()) {
    if (client.name?.toLowerCase() === normalized) return true;
  }
  return false;
}

wsServer.on("connection", (socket) => {
  const clientId = randomUUID();
  store.setClient(clientId, { socket, name: null, isAlive: true });

  sendToClient(socket, {
    type: MESSAGE_TYPES.SYSTEM,
    id: randomUUID(),
    text: "Connected to realtime server",
    timestamp: Date.now()
  });

  sendToClient(socket, {
    type: MESSAGE_TYPES.HISTORY,
    messages: store.getMessages()
  });

  sendToClient(socket, buildPresence());

  socket.on("pong", () => {
    const client = store.getClient(clientId);
    if (!client) return;
    store.setClient(clientId, { ...client, isAlive: true });
  });

  socket.on("message", (message) => {
    const parsed = safeParse<unknown>(message.toString());
    if (!parsed.ok) {
      sendToClient(socket, { type: MESSAGE_TYPES.ERROR, text: "Invalid event payload" });
      return;
    }
    if (!isClientEvent(parsed.value)) {
      sendToClient(socket, { type: MESSAGE_TYPES.ERROR, text: "Unsupported event type" });
      return;
    }
    const event: ClientEvent = parsed.value;

    if (event.type === MESSAGE_TYPES.JOIN) {
      const name = sanitizeText(event.name, 30);
      if (!name) {
        sendToClient(socket, { type: MESSAGE_TYPES.ERROR, text: "Name is required" });
        return;
      }

      const current = store.getClient(clientId);
      if (current?.name) {
        sendToClient(socket, { type: MESSAGE_TYPES.ERROR, text: "You are already joined" });
        return;
      }

      if (usernameExists(name)) {
        sendToClient(socket, { type: MESSAGE_TYPES.ERROR, text: "Name already in use" });
        return;
      }

      store.setClient(clientId, { socket, name, isAlive: true });
      const joinedMessage: ServerEvent = {
        type: MESSAGE_TYPES.SYSTEM,
        id: randomUUID(),
        text: `${name} joined`,
        timestamp: Date.now()
      };
      store.addMessage(joinedMessage);
      broadcast(joinedMessage);
      broadcast(buildPresence());
      return;
    }

    if (event.type === MESSAGE_TYPES.CHAT) {
      const sender = store.getClient(clientId);
      if (!sender?.name) {
        sendToClient(socket, { type: MESSAGE_TYPES.ERROR, text: "Join before sending messages" });
        return;
      }

      const text = sanitizeText(event.text, 300);
      if (!text) return;

      const chatMessage: ServerEvent = {
        type: MESSAGE_TYPES.CHAT,
        id: randomUUID(),
        sender: sender.name,
        text,
        timestamp: Date.now()
      };
      store.addMessage(chatMessage);
      broadcast(chatMessage);
    }
  });

  socket.on("close", () => {
    const client = store.getClient(clientId);
    store.removeClient(clientId);
    if (!client?.name) {
      broadcast(buildPresence());
      return;
    }

    const leftMessage: ServerEvent = {
      type: MESSAGE_TYPES.SYSTEM,
      id: randomUUID(),
      text: `${client.name} left`,
      timestamp: Date.now()
    };
    store.addMessage(leftMessage);
    broadcast(leftMessage);
    broadcast(buildPresence());
  });
});

const heartbeatTimer = setInterval(() => {
  for (const [clientId, client] of store.getClients()) {
    if (!client.isAlive) {
      client.socket.terminate();
      store.removeClient(clientId);
      broadcast(buildPresence());
      continue;
    }

    store.setClient(clientId, { ...client, isAlive: false });
    client.socket.ping();
  }
}, 30000);

wsServer.on("close", () => {
  clearInterval(heartbeatTimer);
});

server.listen(port, () => {
  console.log(`chat app running on http://localhost:${port}`);
});
