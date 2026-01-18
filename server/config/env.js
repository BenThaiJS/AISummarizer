require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  TEMP_DIR: process.env.TEMP_DIR || "temp",
  JOBS_DIR: process.env.JOBS_DIR || "jobs"
};
