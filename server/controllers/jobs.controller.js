const { v4: uuid } = require("uuid");
const { createJob, getJob } = require("../jobs/jobs.store");
const { runJob } = require("../workers/job.worker");
const { broadcast } = require("../websocket/ws");
const logger = require("../utils/logger");
const { validateYouTubeURL } = require("../utils/validateUrl");

exports.createJob = (req, res) => {
  const { url } = req.body;

  // Validate URL is provided
  if (!url) {
    logger.warn("createJob:missing_url");
    return res.status(400).json({ error: "URL is required" });
  }

  // Validate URL format
  const validation = validateYouTubeURL(url);
  if (!validation.isValid) {
    logger.warn("createJob:invalid_url", { url, error: validation.error });
    return res.status(400).json({ error: validation.error });
  }

  const job = createJob(uuid());
  logger.info("Creating job", { id: job.id, url });
  res.json(job);

  logger.info("Starting job worker", { id: job.id });
  runJob(job, url, broadcast);
};

exports.getJob = (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.sendStatus(404);
  // normalize response to ensure expected keys are present
  res.json({
    id: job.id,
    status: job.status,
    phase: job.phase,
    phaseProgress: job.phaseProgress,
    overallProgress: job.overallProgress,
    result: job.result ?? null,
    error: job.error ?? null,
    canceled: job.canceled ?? false,
    clients: job.clients || []
  });
};

exports.cancelJob = (req, res) => {
  const job = getJob(req.params.id);
  if (job) job.canceled = true;
  res.sendStatus(200);
};
