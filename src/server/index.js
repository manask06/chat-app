const path = require("path");
const express = require("express");

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.static(path.join(__dirname, "../client")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "chat-app", module: 1 });
});

app.listen(PORT, () => {
  console.log(`chat app (module 1) running on http://localhost:${PORT}`);
});
