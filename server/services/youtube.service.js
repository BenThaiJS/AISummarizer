const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

exports.downloadAudio = (url, jobDir) =>
  new Promise((resolve, reject) => {
    const audioPath = path.join(jobDir, "audio.wav");

    // Build yt-dlp args with sane defaults and runtime/cookies support
    const args = [
      "-f",
      "bestaudio",
      "--extract-audio",
      "--audio-format",
      "wav",
      "--no-playlist",
      "--no-progress",
      "-o",
      audioPath,
    ];

    // Ensure a JS runtime is available for YouTube decryption (yt-dlp EJS)
    // Prefer the current Node.js executable path so it works even if PATH differs
    const jsRuntimeName = process.env.YTDLP_JS_RUNTIME_NAME || "node";
    const jsRuntimePath = process.env.YTDLP_JS_RUNTIME_PATH || process.execPath; // absolute path to node.exe
    if (jsRuntimeName) {
      // Format: --js-runtimes RUNTIME[:PATH]
      args.push("--js-runtimes", `${jsRuntimeName}:${jsRuntimePath}`);
    }

    // Extractor args: do NOT force android by default (cookies unsupported).
    // If cookies are provided, prefer the web client unless overridden by env.
    let extractorArgs = process.env.YTDLP_EXTRACTOR_ARGS || "";

    // Optional cookie handling to access age-restricted or private videos
    const cookiesFromBrowser = process.env.YTDLP_COOKIES_FROM_BROWSER; // e.g. "chrome", "edge", "firefox"
    const cookiesFile = process.env.YTDLP_COOKIES_FILE; // path to cookies.txt
    let usingCookies = false;
    if (cookiesFromBrowser) {
      args.push("--cookies-from-browser", cookiesFromBrowser);
      usingCookies = true;
    } else if (cookiesFile) {
      args.push("--cookies", cookiesFile);
      usingCookies = true;
    } else {
      // Fallback: use server/cookies/cookies.txt if present
      const fallbackCookies = path.join(__dirname, "..", "cookies", "cookies.txt");
      if (fs.existsSync(fallbackCookies)) {
        args.push("--cookies", fallbackCookies);
        usingCookies = true;
      }
    }

    // Only apply extractor args if explicitly provided via env
    if (extractorArgs) {
      args.push("--extractor-args", extractorArgs);
    }

    // Finally add the URL
    args.push(url);

    logger.info("downloadAudio:start", { url, jobDir, audioPath, args });

    const p = spawn("yt-dlp", args);

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
