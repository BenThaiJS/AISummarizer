# YouTube Summarizer

This project downloads YouTube audio, transcribes it with Whisper, summarizes it via Ollama, and provides a simple React UI.

## Features
- Summarize by YouTube URL
- Upload local audio/video files and summarize# YouTube Summarizer

This project downloads YouTube audio, transcribes it locally with Whisper, summarizes it via Ollama, and provides a simple React UI with live progress updates.

## Features
- Summarize YouTube videos by URL
- Real-time SSE progress updates during downloading, transcribing, and summarizing
- View, copy, or download transcript and summary
- User-friendly UI with centered layout and scrollable content

## Prerequisites (system)
- Node.js 18+
- npm
- `yt-dlp` in PATH ([yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp))
- `ffmpeg` in PATH
- `python` in PATH
- `ollama` in PATH with an available model (e.g., `gemma3:270m`)
# YouTube Summarizer

A lightweight app that downloads YouTube audio, transcribes it with Whisper, and summarizes the transcript. Includes a React UI (Vite) and a Node server that orchestrates download → transcription → summarization with SSE progress updates.

## Features
- Summarize YouTube videos by URL
- Upload local audio/video files for summarization
- Real-time SSE progress updates during download, transcription, and summarization
- Downloadable transcript and summary

## System prerequisites
- Node.js 18+
- npm or yarn
- Python 3.8+ in PATH
- `yt-dlp` in PATH (https://github.com/yt-dlp/yt-dlp)
- `ffmpeg` in PATH
- (Optional) `ollama` in PATH with a model if you use local model-based summarization

## Python dependencies (server)
1. Prefer using a virtual environment:

```bash
cd server
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate
```

2. Install Python requirements. Whisper depends on `torch`; installing the correct `torch` wheel for your platform is recommended before installing the rest.

Example (install CPU-only PyTorch first):

```bash
# Install CPU-only PyTorch (example)
pip install torch --index-url https://download.pytorch.org/whl/cpu
# Then install the rest
pip install -r requirements.txt
```

If you have a CUDA-capable GPU, visit https://pytorch.org/get-started/locally/ for the correct `pip` command to install a CUDA-enabled `torch` wheel.

## Server setup and run

```bash
cd server
npm install
# ensure Python deps installed as above
# Start the Node server
node server.js
```

Server endpoints (summary)
- `POST /summarize` — body: `{ url: string }` starts a YouTube job
- `POST /upload` — multipart/form-data with `file` to summarize uploaded media
- `GET /progress/:jobId` — SSE progress stream
- `GET /result/:jobId` — fetch final transcript + summary

Temporary job data is stored in `temp/` and rotated automatically; adjust retention in `jobs.store.js` if needed.

## Client (UI)

```bash
cd client
npm install
npm run dev
```

Open the Vite dev URL shown in the terminal and use the UI to paste a YouTube URL or upload a file.

## Troubleshooting
- Missing `yt-dlp` / `ffmpeg`: install and add to PATH.
- Whisper errors: ensure `torch` is installed for your platform before installing `openai-whisper`.
- Ollama: ensure the `ollama` CLI and a model are available if the server is configured to use it.

### yt-dlp EJS (JavaScript runtime) and age-restricted videos
Recent yt-dlp versions require an external JavaScript runtime for YouTube decryption. This server automatically passes your Node.js executable to yt-dlp via `--js-runtimes`, but you can override/configure it with env vars in `server/.env`:

```
# Use the current Node.js by default; override if needed
YTDLP_JS_RUNTIME_NAME=node
YTDLP_JS_RUNTIME_PATH=C:\\Program Files\\nodejs\\node.exe

# Optional: set YouTube client used by yt-dlp
# By default, leave unset and let yt-dlp choose
# YTDLP_EXTRACTOR_ARGS=youtube:player_client=web

# If you need to access age-restricted videos, provide cookies:
# Option 1: read from a local browser profile (on this machine)
# Valid values: chrome | edge | firefox
YTDLP_COOKIES_FROM_BROWSER=chrome

# Option 2: point to a cookies.txt file
# YTDLP_COOKIES_FILE=C:\\path\\to\\cookies.txt
```

Quick verification that yt-dlp can run with a JS runtime (from the `server` folder):

```bash
yt-dlp --version
yt-dlp https://www.youtube.com/watch?v=dQw4w9WgXcQ -F --js-runtimes node:"%~dp0..\\..\\node.exe"  # Windows example if needed
```

If you encounter errors like “No supported JavaScript runtime could be found” or “Sign in to confirm your age”, set the env vars above and restart the server.

Note: Avoid forcing `player_client=android` when using cookies; Android client does not support cookies and may only list storyboard images. In most cases, leaving this unset lets yt-dlp pick the right client automatically.

#### Using cookies.txt (reliable on Windows)
On some Windows setups, `--cookies-from-browser` can fail due to DPAPI or locked cookie DBs. Export cookies to a `cookies.txt` file instead:

1. Install a browser extension like "Get cookies.txt" (Chrome/Edge/Firefox).
2. Open youtube.com in the browser where you are signed in.
3. Export cookies for the domain and save as `cookies.txt`.
4. Place the file at `server/cookies/cookies.txt`.
5. Alternatively, set `YTDLP_COOKIES_FILE` in `server/.env` to the absolute path.

The server automatically prefers `YTDLP_COOKIES_FROM_BROWSER` if set; otherwise it uses `YTDLP_COOKIES_FILE`; otherwise it auto-detects `server/cookies/cookies.txt` if present.

Tip: If using `--cookies-from-browser`, avoid running the terminal as Administrator and close all browser windows before retrying.

## Security & production notes
- This project is a prototype. Add authentication, validation, rate-limiting, and persistent storage before public deployment.
- For large videos, consider chunked transcription and streaming to reduce memory and latency.

---

If you want, I can also add explicit `requirements.txt` installation notes for Windows or update `server/README` with troubleshooting commands.
