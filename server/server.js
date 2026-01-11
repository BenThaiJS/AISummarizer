const http = require("http");
const app = require("./app");
const { initWebSocket } = require("./websocket/ws");
const { PORT } = require("./config/env");

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
