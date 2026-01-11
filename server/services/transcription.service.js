const { spawn } = require("child_process");
const path = require("path");
const logger = require("../utils/logger");

// Dev stub: simulate transcription when DEV_STUB_TRANSCRIBE=1
if (process.env.DEV_STUB_TRANSCRIBE === "1") {
  exports.transcribe = (audioPath, onProgress) =>
    new Promise((resolve) => {
      logger.info("transcribe:dev_stub_start", { audioPath });
      let p = 0;
      const iv = setInterval(() => {
        p += 10;
        try {
          onProgress && onProgress(p);
        } catch (e) {}
        if (p >= 100) {
          clearInterval(iv);
          const fake = `This is a fake transcript for ${audioPath}.\nGenerated for frontend testing.`;
          logger.info("transcribe:dev_stub_done");
          resolve(fake);
        }
      }, 300);
    });
} else {
  exports.transcribe = (audioPath, onProgress) =>
    new Promise((resolve, reject) => {
      const script = path.join(__dirname, "..", "python", "transcribe.py");
      logger.info("transcribe:start", { script, audioPath });

      const py = spawn("python", [script, audioPath]);

      let stdout = "";
      let stderr = "";

      py.stdout.on("data", (data) => {
        const s = data.toString();
        stdout += s;
        // optional: try to stream partial progress messages if the script emits them
        try {
          const maybe = JSON.parse(s);
          if (maybe && maybe.progress) {
            onProgress && onProgress(maybe.progress);
          }
        } catch (e) {
          // not JSON, ignore
        }
      });

      py.stderr.on("data", (err) => {
        stderr += err.toString();
      });

      py.on("error", (e) => {
        logger.error("transcribe:error_spawn", { err: e.message });
        reject(e);
      });

      py.on("close", (code) => {
        if (code === 0) {
          try {
            const res = JSON.parse(stdout || "{}");
            if (!res || typeof res.text !== "string") {
              const err = new Error("transcribe: no text in output");
              logger.error("transcribe:invalid_output", { stdout, stderr });
              return reject(err);
            }
            logger.info("transcribe:done");
            resolve(res.text);
          } catch (e) {
            logger.error("transcribe:parse_error", { err: e.message, stdout, stderr });
            return reject(e);
          }
        } else {
          const message = stderr || stdout || `python exited with code ${code}`;
          logger.error("transcribe:exit_error", { code, message });
          reject(new Error(message));
        }
      });
    });
}
