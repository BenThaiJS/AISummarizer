require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  OLLAMA_URL: process.env.OLLAMA_URL || "http://localhost:11434",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "gemma3:270m",
  TEMP_DIR: process.env.TEMP_DIR || "temp",
  JOBS_DIR: process.env.JOBS_DIR || "jobs"
};
