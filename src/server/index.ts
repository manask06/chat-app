import path from "path";
import http from "http";
import { randomUUID } from "crypto";
import express, { type Request, type Response } from "express";
import { WebSocketServer, type WebSocket } from "ws";
import {
  MESSAGE_TYPES,
  type ClientEvent,
  type ServerEvent,
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
  return { type: MESSAGE_TYPES.PRESENCE, users };
}

wsServer.on("connection", (socket) => {
  const clientId = randomUUID();
  store.setClient(clientId, { socket, name: null });

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

  socket.on("message", (message) => {
    const parsed = safeParse<ClientEvent>(message.toString());
    if (!parsed.ok) {
      sendToClient(socket, { type: MESSAGE_TYPES.ERROR, text: "Invalid event payload" });
      return;
    }

    if (parsed.value.type === MESSAGE_TYPES.JOIN) {
      const name = sanitizeText(parsed.value.name, 30);
      if (!name) {
        sendToClient(socket, { type: MESSAGE_TYPES.ERROR, text: "Name is required" });
        return;
      }

      store.setClient(clientId, { socket, name });
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

    if (parsed.value.type === MESSAGE_TYPES.CHAT) {
      const sender = store.getClient(clientId);
      if (!sender?.name) {
        sendToClient(socket, { type: MESSAGE_TYPES.ERROR, text: "Join before sending messages" });
        return;
      }

      const text = sanitizeText(parsed.value.text, 300);
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

server.listen(port, () => {
  console.log(`chat app running on http://localhost:${port}`);
});
