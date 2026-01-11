const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "..", "logs");
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch (e) {}

function log(level, message, meta = {}) {
  const entry = JSON.stringify({ time: new Date().toISOString(), level, message, ...meta });
  // console for immediate visibility
  console.log(entry);
  // append to file (best-effort, async)
  try {
    fs.appendFile(path.join(logDir, "server.log"), entry + "\n", (err) => {});
  } catch (e) {
    // ignore file errors
  }
}

module.exports = {
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
};
