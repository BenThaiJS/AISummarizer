const logger = require("../utils/logger");

const jobs = new Map();

// Job TTL in milliseconds (2 hours)
const JOB_TTL = process.env.JOB_TTL ? parseInt(process.env.JOB_TTL, 10) : 2 * 60 * 60 * 1000;

function createJob(id) {
  const job = {
    id,
    status: "queued",
    phase: "Queued",
    phaseProgress: 0,
    overallProgress: 0,
    result: null,
    error: null,
    canceled: false,
    clients: [],
    createdAt: Date.now(), // Track creation time for cleanup
  };
  jobs.set(id, job);
  return job;
}

function getJob(id) {
  return jobs.get(id);
}

function updateJob(id, data) {
  const job = jobs.get(id);
  if (job) {
    Object.assign(job, data);
  }
}

/**
 * Clean up old jobs from memory
 * Called periodically to prevent memory leaks
 * @returns {number} Number of jobs deleted
 */
function cleanupOldJobs() {
  const now = Date.now();
  let cleaned = 0;

  jobs.forEach((job, id) => {
    const age = now - job.createdAt;
    if (age > JOB_TTL) {
      jobs.delete(id);
      cleaned++;
      logger.info("cleanupOldJobs:deleted", { id, age: Math.round(age / 1000) + "s" });
    }
  });

  if (cleaned > 0) {
    logger.info("cleanupOldJobs:summary", { deleted: cleaned, remaining: jobs.size });
  }

  return cleaned;
}

/**
 * Get job statistics for monitoring
 */
function getJobStats() {
  const stats = {
    total: jobs.size,
    byStatus: {},
  };

  jobs.forEach((job) => {
    stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1;
  });

  return stats;
}

module.exports = {
  createJob,
  getJob,
  updateJob,
  cleanupOldJobs,
  getJobStats,
  jobs
};
