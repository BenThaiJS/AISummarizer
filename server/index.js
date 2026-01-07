const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// In-memory job store
const jobs = {};

// SSE broadcaster
function broadcast(jobId, event, data) {
  const job = jobs[jobId];
  if (!job) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  job.clients.forEach(res => res.write(payload));
  console.log(`[${jobId}] ${event}:`, data);
}

// SSE endpoint
app.get('/progress/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.sendStatus(404);

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  job.clients.push(res);
  req.on('close', () => {
    job.clients = job.clients.filter(c => c !== res);
  });
});

// Result endpoint
app.get('/result/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.sendStatus(404);

  res.json({
    transcript: job.transcript || '',
    summary: job.summary || '',
  });
});

// Summarize YouTube
app.post('/summarize', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  const jobId = uuidv4();
  const jobDir = path.join(__dirname, 'temp', jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  jobs[jobId] = { clients: [], transcript: '', summary: '' };

  res.json({ jobId, progressUrl: `/progress/${jobId}` });

  try {
    // 1️⃣ Download audio
    broadcast(jobId, 'status', { status: 'downloading', percent: 10 });

    const audioPath = path.join(jobDir, 'audio.wav');
    await new Promise((resolve, reject) => {
      const p = spawn('yt-dlp', ['-x', '--audio-format', 'wav', '-o', audioPath, url]);
      p.on('close', code => (code === 0 ? resolve() : reject(new Error('yt-dlp failed'))));
    });
    broadcast(jobId, 'status', { status: 'downloading', percent: 30 });

    // 2️⃣ Transcribe with real-time segment updates
    broadcast(jobId, 'status', { status: 'transcribing', percent: 35 });

    const transcriptPath = path.join(jobDir, 'transcript.txt');
    const p = spawn('python', ['transcribe.py', audioPath, transcriptPath]);

    let segmentCount = 0;
    let totalSegments = 50; // You can update this or detect dynamically from transcribe.py

    p.stdout.on('data', (d) => {
      d.toString().split('\n').forEach(line => {
        try {
          const obj = JSON.parse(line);
          if (obj.status === 'transcribing_segment') {
            segmentCount++;
            const percent = 35 + Math.floor((segmentCount / totalSegments) * 25); // 35-60%
            broadcast(jobId, 'status', { status: 'transcribing', percent, segment: obj });
          }
        } catch {}
      });
    });

    await new Promise((resolve, reject) => {
      p.on('close', code => (code === 0 ? resolve() : reject(new Error('transcription failed'))));
    });

    const transcript = fs.readFileSync(transcriptPath, 'utf8').trim();
    if (!transcript) {
      broadcast(jobId, 'error', { message: 'No transcript generated' });
      return;
    }
    jobs[jobId].transcript = transcript;
    broadcast(jobId, 'status', { status: 'transcribing', percent: 60 });

    // 3️⃣ Summarize with Ollama (can also update percent dynamically)
    broadcast(jobId, 'status', { status: 'summarizing', percent: 65 });

    const ollamaRes = await axios.post('http://127.0.0.1:11434/api/generate', {
      model: 'gemma3:270m',
      prompt: `Summarize the following transcript clearly and concisely:\n\n${transcript}`,
      stream: false,
    });

    const summary = (ollamaRes.data.response || '').trim();
    jobs[jobId].summary = summary;
    broadcast(jobId, 'status', { status: 'summarizing', percent: 100 });

    // ✅ Done
    broadcast(jobId, 'done', { transcript, summary });

  } catch (err) {
    broadcast(jobId, 'error', { message: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
