import test from "node:test";
import assert from "node:assert/strict";
import { MESSAGE_TYPES, isClientEvent, safeParse, sanitizeText } from "./protocol";

test("safeParse parses valid JSON", () => {
  const parsed = safeParse<{ ok: boolean }>('{"ok":true}');
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.ok, true);
  }
});

test("safeParse returns failure for invalid JSON", () => {
  const parsed = safeParse<unknown>("{bad");
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.value, null);
  }
});

test("sanitizeText trims and caps length", () => {
  assert.equal(sanitizeText("  hello  "), "hello");
  assert.equal(sanitizeText("abcdef", 3), "abc");
  assert.equal(sanitizeText("", 3), "");
  assert.equal(sanitizeText(123), "");
});

test("isClientEvent validates join and chat payloads", () => {
  assert.equal(isClientEvent({ type: MESSAGE_TYPES.JOIN, name: "manas" }), true);
  assert.equal(isClientEvent({ type: MESSAGE_TYPES.CHAT, text: "hello" }), true);
  assert.equal(isClientEvent({ type: MESSAGE_TYPES.JOIN, name: 1 }), false);
  assert.equal(isClientEvent({ type: MESSAGE_TYPES.CHAT, text: null }), false);
  assert.equal(isClientEvent({ type: "unknown" }), false);
  assert.equal(isClientEvent(null), false);
});

