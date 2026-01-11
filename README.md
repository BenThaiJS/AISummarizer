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

## Server setup
```bash
cd server
npm install
# Python deps for Whisper
python -m pip install -r requirements.txt

- SSE progress updates during processing
- Download or copy transcript and summary from UI

## Prerequisites (system)
- Node.js 18+
- npm
- `yt-dlp` in PATH (https://github.com/yt-dlp/yt-dlp)
- `ffmpeg` in PATH
- `python` in PATH
- `ollama` in PATH (or change the server calls to your model)

## Server setup
```bash
cd server
npm install
# Python deps (whisper requires torch; pick appropriate torch wheel for your platform)
python -m pip install -r requirements.txt
```

If `openai-whisper` needs a specific `torch`, follow Whisper installation docs.

Start server:
```bash
node index.js
```

Server endpoints
- `POST /summarize` { url: string } — starts a job for a YouTube URL; response `{ jobId, progressUrl }`
- `POST /upload` multipart/form-data with `file` — upload local file to summarize; response `{ jobId, progressUrl }`
- `GET /progress/:jobId` — SSE progress stream
- `GET /result/:jobId` — fetch final transcript + summary

Temporary job data is kept for 5 minutes after completion.

## Client setup
```bash
cd client
npm install
npm run dev
```

Open the dev URL (Vite) to use the UI. Paste a YouTube URL or upload a local file and click the button. Progress appears live and final transcript/summary can be downloaded.

## Troubleshooting
- Missing `yt-dlp` / `ffmpeg`: install and ensure they are in your PATH.
- Whisper errors: ensure `torch` is installed for your platform before installing `openai-whisper`.
- Ollama: ensure `ollama` CLI is installed and a model like `phi3` is available, or edit `server/index.js` to call your preferred model or API.

## Security and production notes
- This server is a prototype: add auth, stricter validation, and persistent storage before public use.
- Consider streaming transcription (Whisper supports timestamps) and batching for large videos.

*** End of README
