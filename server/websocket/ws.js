const WebSocket = require("ws");
const { getJob } = require("../jobs/jobs.store");

let wss = null;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    // allow clients to subscribe to a specific jobId by sending
    // { "type": "subscribe", "jobId": "..." }
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        if (data && data.type === "subscribe" && data.jobId) {
          ws.jobId = data.jobId;
        }
      } catch (e) {
        // ignore non-JSON messages
      }
    });

    ws.send(JSON.stringify({ type: "connected" }));
  });
}

function broadcast(jobId) {
  if (!wss) return;
  const job = getJob(jobId);
  if (!job) return;

  const payload = JSON.stringify({ type: "job:update", job });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // if client has subscribed to a job, only send matching updates
      if (!client.jobId || client.jobId === jobId) {
        client.send(payload);
      }
    }
  });
}

module.exports = { initWebSocket, broadcast };
