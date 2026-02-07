const MESSAGE_TYPES = {
  JOIN: "join",
  CHAT: "chat",
  SYSTEM: "system",
  PRESENCE: "presence",
  ERROR: "error"
};

function safeParse(jsonString) {
  try {
    return { ok: true, value: JSON.parse(jsonString) };
  } catch (_error) {
    return { ok: false, value: null };
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeText(value, maxLength = 300) {
  if (!isNonEmptyString(value)) return "";
  return value.trim().slice(0, maxLength);
}

module.exports = {
  MESSAGE_TYPES,
  safeParse,
  sanitizeText,
  isNonEmptyString
};

