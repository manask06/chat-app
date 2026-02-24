import type WebSocket from "ws";
import type { ChatMessage, SystemMessage } from "../shared/protocol";

export type SocketClient = {
  socket: WebSocket;
  name: string | null;
  isAlive: boolean;
};

export type StoredMessage = ChatMessage | SystemMessage;

export function createStateStore() {
  const clients = new Map<string, SocketClient>();
  const messages: StoredMessage[] = [];

  return {
    setClient(clientId: string, value: SocketClient): void {
      clients.set(clientId, value);
    },
    removeClient(clientId: string): void {
      clients.delete(clientId);
    },
    getClient(clientId: string): SocketClient | undefined {
      return clients.get(clientId);
    },
    getClients(): Map<string, SocketClient> {
      return clients;
    },
    addMessage(message: StoredMessage): void {
      messages.push(message);
      if (messages.length > 100) {
        messages.shift();
      }
    },
    getMessages(): StoredMessage[] {
      return messages;
    }
  };
}
