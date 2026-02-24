export const MESSAGE_TYPES = {
  JOIN: "join",
  CHAT: "chat",
  SYSTEM: "system",
  PRESENCE: "presence",
  ERROR: "error",
  HISTORY: "history"
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export type ParseResult<T> = { ok: true; value: T } | { ok: false; value: null };

export type JoinEvent = {
  type: typeof MESSAGE_TYPES.JOIN;
  name: string;
};

export type ChatEvent = {
  type: typeof MESSAGE_TYPES.CHAT;
  text: string;
};

export type ClientEvent = JoinEvent | ChatEvent;

export type ChatMessage = {
  type: typeof MESSAGE_TYPES.CHAT;
  id: string;
  sender: string;
  text: string;
  timestamp: number;
};

export type SystemMessage = {
  type: typeof MESSAGE_TYPES.SYSTEM;
  id: string;
  text: string;
  timestamp: number;
};

export type PresenceEvent = {
  type: typeof MESSAGE_TYPES.PRESENCE;
  users: string[];
};

export type HistoryEvent = {
  type: typeof MESSAGE_TYPES.HISTORY;
  messages: Array<ChatMessage | SystemMessage>;
};

export type ErrorEvent = {
  type: typeof MESSAGE_TYPES.ERROR;
  text: string;
};

export type ServerEvent = ChatMessage | SystemMessage | PresenceEvent | HistoryEvent | ErrorEvent;

export function isClientEvent(value: unknown): value is ClientEvent {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;

  if (value.type === MESSAGE_TYPES.JOIN) {
    return "name" in value && typeof value.name === "string";
  }

  if (value.type === MESSAGE_TYPES.CHAT) {
    return "text" in value && typeof value.text === "string";
  }

  return false;
}

export function safeParse<T>(jsonString: string): ParseResult<T> {
  try {
    return { ok: true, value: JSON.parse(jsonString) as T };
  } catch {
    return { ok: false, value: null };
  }
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function sanitizeText(value: unknown, maxLength = 300): string {
  if (!isNonEmptyString(value)) return "";
  return value.trim().slice(0, maxLength);
}
