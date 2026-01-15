const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const { downloadAudio } = require("../services/youtube.service");
const { transcribe } = require("../services/transcription.service");
const { summarize } = require("../services/summarization.service");
const { updateJob } = require("../jobs/jobs.store");
const logger = require("../utils/logger");

/**
 * Cleanup temporary job directory
 * @param {string} jobDir - Path to job directory to delete
 */
function cleanupJobDir(jobDir) {
  return new Promise((resolve) => {
    fs.rm(jobDir, { recursive: true, force: true }, (err) => {
      if (err) {
        logger.warn("cleanupJobDir:error", { dir: jobDir, err: err.message });
      } else {
        logger.info("cleanupJobDir:success", { dir: jobDir });
      }
      resolve(); // Always resolve, don't reject - cleanup shouldn't block
    });
  });
}

exports.runJob = async (job, url, broadcast) => {
  const jobDir = path.join("temp", job.id);
  fs.mkdirSync(jobDir, { recursive: true });

  try {
    logger.info("runJob:start", { id: job.id, url });

    updateJob(job.id, { phase: "Downloading", status: "downloading" });
    broadcast(job.id);
    logger.info("runJob:downloading", { id: job.id });

    const audioPath = await downloadAudio(url, jobDir);
    logger.info("runJob:downloaded", { id: job.id, audioPath });

    updateJob(job.id, { phase: "Transcribing", status: "transcribing" });
    broadcast(job.id);
    logger.info("runJob:transcribing", { id: job.id });

    const transcript = await transcribe(audioPath, (p) => {
      // transcription progress callback (if supported)
      updateJob(job.id, { phaseProgress: p });
      broadcast(job.id);
    });
    logger.info("runJob:transcribed", { id: job.id, length: transcript ? transcript.length : 0 });

    updateJob(job.id, { phase: "Summarizing", status: "summarizing", phaseProgress: 0 });
    broadcast(job.id);
    logger.info("runJob:summarizing", { id: job.id });

    const summary = await summarize(transcript, (p) => {
      updateJob(job.id, { phaseProgress: p });
      broadcast(job.id);
    });

    updateJob(job.id, {
      status: "completed",
      phase: "Completed",
      result: {
        transcript,
        summary,
      },
      phaseProgress: 100,
      overallProgress: 100,
    });

    logger.info("runJob:completed", { id: job.id });
    broadcast(job.id);

    // Cleanup temp directory after successful completion
    await cleanupJobDir(jobDir);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    logger.error("Job failed", { err: msg });
    updateJob(job.id, { status: "failed", error: msg });
    broadcast(job.id);

    // Cleanup temp directory even on failure
    await cleanupJobDir(jobDir);
  }
};
