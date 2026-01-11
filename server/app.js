const express = require("express");
const cors = require("cors");
const jobsRoutes = require("./routes/jobs.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/jobs", jobsRoutes);

app.get("/health", (_, res) =>
  res.json({ status: "ok", whisper: "ready", ollama: "ready" })
);

module.exports = app;
