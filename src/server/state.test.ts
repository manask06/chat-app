import test from "node:test";
import assert from "node:assert/strict";
import type WebSocket from "ws";
import { MESSAGE_TYPES, type ChatMessage } from "../shared/protocol";
import { createStateStore } from "./state";

function chatMessage(id: number): ChatMessage {
  return {
    type: MESSAGE_TYPES.CHAT,
    id: `id-${id}`,
    sender: "user",
    text: `text-${id}`,
    timestamp: Date.now()
  };
}

test("state store adds and removes clients", () => {
  const store = createStateStore();
  const fakeSocket = {} as WebSocket;

  store.setClient("c1", { socket: fakeSocket, name: "manas", isAlive: true });
  assert.equal(store.getClient("c1")?.name, "manas");
  assert.equal(store.getClients().size, 1);

  store.removeClient("c1");
  assert.equal(store.getClient("c1"), undefined);
  assert.equal(store.getClients().size, 0);
});

test("state store keeps only last 100 messages", () => {
  const store = createStateStore();

  for (let i = 0; i < 120; i += 1) {
    store.addMessage(chatMessage(i));
  }

  const messages = store.getMessages();
  assert.equal(messages.length, 100);
  assert.equal(messages[0]?.id, "id-20");
  assert.equal(messages[99]?.id, "id-119");
});

