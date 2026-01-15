const http = require("http");
const app = require("./app");
const { initWebSocket } = require("./websocket/ws");
const { cleanupOldJobs } = require("./jobs/jobs.store");
const { PORT } = require("./config/env");
const logger = require("./utils/logger");

const server = http.createServer(app);
initWebSocket(server);

// Start periodic job cleanup (every 10 minutes)
const CLEANUP_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
  try {
    cleanupOldJobs();
  } catch (err) {
    logger.error("Cleanup interval error", { err: err.message });
  }
}, CLEANUP_INTERVAL);

server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
});
