const express = require("express");
const cors = require("cors");
const jobsRoutes = require("./routes/jobs.routes");
const { getJobStats } = require("./jobs/jobs.store");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/jobs", jobsRoutes);

app.get("/health", (_, res) => {
  const stats = getJobStats();
  res.json({ 
    status: "ok", 
    whisper: "ready", 
    ollama: "ready",
    jobs: stats
  });
});


// Default route for root
app.get("/", (req, res) => {
  res.send("<h2>AI YouTuber Summarizer server has been started. Use the client UI or API endpoints to interact.</h2>");
});

module.exports = app;
