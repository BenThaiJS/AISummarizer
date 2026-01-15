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

module.exports = app;
