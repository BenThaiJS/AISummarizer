
# YouTube Summarizer

A lightweight app to download YouTube audio, transcribe it with Whisper, and summarize the transcript. Includes a React UI (Vite) and a Node server that orchestrates download → transcription → summarization with SSE progress updates.

## Features
- Summarize YouTube videos by URL
- Upload local audio/video files for summarization
- Real-time SSE progress updates during download, transcription, and summarization
- Downloadable transcript and summary

## System prerequisites
- Node.js 18+
- npm or yarn
- Python 3.8+ in PATH
- `yt-dlp` in PATH ([yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp))
- `ffmpeg` in PATH
- (Optional) `ollama` in PATH with a model if you use local model-based summarization

## Python dependencies (server)
See `server/requirements.txt` for required packages. Use a virtual environment for best results.

## Server setup and run
```bash
cd server
npm install
# ensure Python deps installed as above
node server.js
```

## Client (UI)
```bash
cd client
npm install
npm run dev
```

Open the Vite dev URL shown in the terminal and use the UI to paste a YouTube URL or upload a file.

## Troubleshooting & Documentation
- See the `doc/` folder for guides on error handling, rate limiting, transcript features, and more.
- If you encounter issues with yt-dlp, ffmpeg, Whisper, or Ollama, refer to the relevant documentation in `doc/`.

## Security & production notes
- This project is a prototype. Add authentication, validation, rate-limiting, and persistent storage before public deployment.
- For large videos, consider chunked transcription and streaming to reduce memory and latency.

---

**Note:** All additional documentation and guides have been moved to the `doc/` folder for clarity.
