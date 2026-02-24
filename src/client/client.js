// @ts-check

(function boot() {
  const statusNode = document.getElementById("status");
  const presenceNode = document.getElementById("presence");
  const messagesNode = document.getElementById("messages");
  const joinForm = document.getElementById("join-form");
  const nameInput = document.getElementById("name-input");
  const joinButton = document.getElementById("join-btn");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-btn");

  if (
    !(statusNode instanceof HTMLDivElement) ||
    !(presenceNode instanceof HTMLDivElement) ||
    !(messagesNode instanceof HTMLUListElement) ||
    !(joinForm instanceof HTMLFormElement) ||
    !(nameInput instanceof HTMLInputElement) ||
    !(joinButton instanceof HTMLButtonElement) ||
    !(chatForm instanceof HTMLFormElement) ||
    !(chatInput instanceof HTMLInputElement) ||
    !(sendButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  /** @type {HTMLDivElement} */
  const statusEl = statusNode;
  /** @type {HTMLDivElement} */
  const presenceEl = presenceNode;
  /** @type {HTMLUListElement} */
  const messagesEl = messagesNode;
  /** @type {HTMLFormElement} */
  const joinFormEl = joinForm;
  /** @type {HTMLInputElement} */
  const nameInputEl = nameInput;
  /** @type {HTMLButtonElement} */
  const joinButtonEl = joinButton;
  /** @type {HTMLFormElement} */
  const chatFormEl = chatForm;
  /** @type {HTMLInputElement} */
  const chatInputEl = chatInput;
  /** @type {HTMLButtonElement} */
  const sendButtonEl = sendButton;

  /** @type {WebSocket | null} */
  let socket = null;
  let hasJoined = false;
  let reconnectAttempts = 0;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let reconnectTimer = null;
  let desiredName = "";

  /**
   * @param {boolean} connected
   */
  function setConnectionState(connected) {
    if (connected) {
      statusEl.textContent = "Connected";
    } else if (reconnectTimer !== null) {
      statusEl.textContent = "Disconnected, reconnecting...";
    } else {
      statusEl.textContent = "Disconnected";
    }
    const canChat = connected && hasJoined;
    chatInputEl.disabled = !canChat;
    sendButtonEl.disabled = !canChat;
  }

  function clearReconnectTimer() {
    if (reconnectTimer === null) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function scheduleReconnect() {
    clearReconnectTimer();
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
    setConnectionState(false);
  }

  /**
   * @param {string} text
   * @param {string} [meta]
   * @param {boolean} [system]
   */
  function addMessage(text, meta, system = false) {
    const item = document.createElement("li");
    if (meta) {
      const metaNode = document.createElement("div");
      metaNode.className = "meta";
      metaNode.textContent = meta;
      item.appendChild(metaNode);
    }
    if (system) item.classList.add("system");
    item.append(text);
    messagesEl.appendChild(item);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /**
   * @param {string[]} users
   */
  function setPresence(users) {
    presenceEl.textContent = users.length ? `Online: ${users.join(", ")}` : "No users online";
  }

  function connect() {
    clearReconnectTimer();
    socket = new WebSocket(window.location.origin.replace(/^http/, "ws"));
    const currentSocket = socket;

    currentSocket.addEventListener("open", () => {
      reconnectAttempts = 0;
      setConnectionState(true);
      if (desiredName && !hasJoined) {
        currentSocket.send(JSON.stringify({ type: "join", name: desiredName }));
        hasJoined = true;
        nameInputEl.disabled = true;
        joinButtonEl.disabled = true;
        setConnectionState(true);
      }
    });

    currentSocket.addEventListener("close", () => {
      const shouldRetry = Boolean(desiredName);
      hasJoined = false;
      if (!shouldRetry) {
        nameInputEl.disabled = false;
        joinButtonEl.disabled = false;
      }
      if (shouldRetry) {
        scheduleReconnect();
      } else {
        setConnectionState(false);
      }
    });

    currentSocket.addEventListener("message", (event) => {
      const raw = event.data;
      if (typeof raw !== "string") return;

      /** @type {unknown} */
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }

      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === "presence" &&
        "users" in payload &&
        Array.isArray(payload.users)
      ) {
        const users = payload.users.filter((user) => typeof user === "string");
        setPresence(users);
        return;
      }

      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === "history" &&
        "messages" in payload &&
        Array.isArray(payload.messages)
      ) {
        messagesEl.innerHTML = "";
        payload.messages.forEach((message) => {
          if (typeof message !== "object" || message === null || !("type" in message)) return;

          if (
            message.type === "chat" &&
            "text" in message &&
            "sender" in message &&
            typeof message.text === "string" &&
            typeof message.sender === "string"
          ) {
            const timestamp =
              "timestamp" in message && typeof message.timestamp === "number" ? message.timestamp : Date.now();
            const at = new Date(timestamp).toLocaleTimeString();
            addMessage(message.text, `${message.sender} • ${at}`);
          } else {
            const systemText = "text" in message && typeof message.text === "string" ? message.text : "";
            if (systemText) addMessage(systemText, undefined, true);
          }
        });
        return;
      }

      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === "chat" &&
        "text" in payload &&
        "sender" in payload &&
        typeof payload.text === "string" &&
        typeof payload.sender === "string"
      ) {
        const timestamp = "timestamp" in payload && typeof payload.timestamp === "number" ? payload.timestamp : Date.now();
        const at = new Date(timestamp).toLocaleTimeString();
        addMessage(payload.text, `${payload.sender} • ${at}`);
        return;
      }

      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === "error" &&
        "text" in payload &&
        typeof payload.text === "string"
      ) {
        addMessage(`Error: ${payload.text}`, undefined, true);
        if (payload.text === "Name already in use") {
          desiredName = "";
          hasJoined = false;
          clearReconnectTimer();
          nameInputEl.disabled = false;
          joinButtonEl.disabled = false;
          setConnectionState(socket?.readyState === WebSocket.OPEN);
        }
        return;
      }

      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === "system" &&
        "text" in payload &&
        typeof payload.text === "string"
      ) {
        addMessage(payload.text, undefined, true);
      }
    });
  }

  joinFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const name = nameInputEl.value.trim();
    if (!name) return;
    desiredName = name;
    socket.send(JSON.stringify({ type: "join", name }));
    hasJoined = true;
    nameInputEl.disabled = true;
    joinButtonEl.disabled = true;
    setConnectionState(true);
    chatInputEl.focus();
  });

  chatFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!socket || socket.readyState !== WebSocket.OPEN || !hasJoined) return;
    const text = chatInputEl.value.trim();
    if (!text) return;
    socket.send(JSON.stringify({ type: "chat", text }));
    chatInputEl.value = "";
  });

  connect();
})();
