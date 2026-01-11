const { spawn } = require("child_process");
const path = require("path");
const logger = require("../utils/logger");

exports.downloadAudio = (url, jobDir) =>
  new Promise((resolve, reject) => {
    const audioPath = path.join(jobDir, "audio.wav");

    logger.info("downloadAudio:start", { url, jobDir, audioPath });

    const p = spawn("yt-dlp", [
      "-f",
      "bestaudio",
      "--extract-audio",
      "--audio-format",
      "wav",
      "-o",
      audioPath,
      url,
    ]);

    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("close", (code) => {
      if (code === 0) {
        logger.info("downloadAudio:done", { audioPath });
        resolve(audioPath);
      } else {
        const err = new Error(`yt-dlp failed (code=${code}): ${stderr}`);
        logger.error("downloadAudio:error", { err: err.message });
        reject(err);
      }
    });
    p.on("error", (e) => {
      logger.error("downloadAudio:spawn_error", { err: e.message });
      reject(e);
    });
  });
