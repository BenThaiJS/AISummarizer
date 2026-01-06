const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const TEMP_DIR = path.join(__dirname, 'temp');
fs.ensureDirSync(TEMP_DIR);

// Resolve Ollama command once at startup. This allows a permanent fix
// when the server's PATH differs from an interactive shell.
function resolveOllamaCmd() {
  if (process.env.OLLAMA_CMD) return process.env.OLLAMA_CMD;
  const isWin = process.platform === 'win32';
  try {
    const { spawnSync } = require('child_process');
    const probe = isWin ? 'where' : 'which';
    const out = spawnSync(probe, ['ollama'], { encoding: 'utf8' });
    if (out.status === 0 && out.stdout) {
      const candidate = out.stdout.split(/\r?\n/)[0].trim();
      if (candidate) return candidate;
    }
  } catch (e) {
    // ignore
  }
  return 'ollama';
}

const OLLAMA_CMD = resolveOllamaCmd();

// log a quick check of the executable
try {
  const { spawnSync } = require('child_process');
  const v = spawnSync(OLLAMA_CMD, ['--version'], { encoding: 'utf8' });
  if (v.status === 0) console.log(`Ollama executable: ${OLLAMA_CMD}`);
  else console.warn('Ollama check failed:', v.stderr || v.stdout || v.status);
} catch (e) {
  console.warn('Ollama check error:', e.message);
}

/* -------------------- JOB STATE -------------------- */
const jobs = new Map(); // jobId -> { clients: [] }

/* -------------------- HELPERS -------------------- */
function createJob() {
  const jobId = crypto.randomBytes(8).toString('hex');
  jobs.set(jobId, { clients: [] });

  // auto-cleanup after 30 min
  setTimeout(() => {
    jobs.delete(jobId);
    fs.remove(path.join(TEMP_DIR, jobId)).catch(() => {});
  }, 30 * 60 * 1000);

  return jobId;
}

function broadcast(jobId, event, data) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.clients.forEach((res) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

function startHeartbeat(res) {
  const interval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);
  res.on('close', () => clearInterval(interval));
}

function run(cmd, args, cwd, onLine) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, shell: true, windowsHide: true });

    p.stdout.on('data', (d) => onLine && onLine(d.toString()));
    p.stderr.on('data', (d) => onLine && onLine(d.toString()));

    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

/* -------------------- ROUTES -------------------- */
app.post('/summarize', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  const jobId = createJob();
  const jobDir = path.join(TEMP_DIR, jobId);
  await fs.ensureDir(jobDir);

  res.json({ jobId, progressUrl: `/progress/${jobId}` });

  (async () => {
    try {
      broadcast(jobId, 'status', { status: 'downloading', percent: 10 });

      const audioTemplate = path.join(jobDir, 'audio.%(ext)s');
      await run(
        'yt-dlp',
        ['--no-playlist', '-f', 'bestaudio', '-o', audioTemplate, url],
        jobDir,
        (line) => broadcast(jobId, 'status', { status: 'yt-dlp', line })
      );

      const files = await fs.readdir(jobDir);
      const audioFile = files.find(f => f.startsWith('audio.'));
      if (!audioFile) {
        broadcast(jobId, 'error', { message: 'Audio file not found after yt-dlp' });
        return;
      }

      const audioPath = path.join(jobDir, audioFile);

      broadcast(jobId, 'status', { status: 'converting', percent: 25 });
      const wavPath = path.join(jobDir, 'audio.wav');
      await run(
        'ffmpeg',
        ['-y', '-i', audioPath, '-ar', '16000', '-ac', '1', wavPath],
        jobDir,
        (line) => broadcast(jobId, 'status', { status: 'ffmpeg', line })
      );

      if (!(await fs.pathExists(wavPath))) {
        broadcast(jobId, 'error', { message: 'Failed to create audio.wav' });
        return;
      }

      broadcast(jobId, 'status', { status: 'transcribing', percent: 45 });
      const transcriptPath = path.join(jobDir, 'transcript.txt');
      let transcript = '';

      // run transcribe.py using an absolute path so it can be executed from the job dir
      const transcribeScript = path.join(__dirname, 'transcribe.py');
      await run(
        'python',
        [transcribeScript, wavPath, transcriptPath],
        jobDir,
        (line) => {
          line = line.trim();
          if (!line) return;
          if (line === 'TRANSCRIBE_OK') return;

          try {
            const data = JSON.parse(line);
            if (data.status === 'transcribing_segment') {
              broadcast(jobId, 'transcribing_segment', data);
              transcript += data.text + ' ';
            } else if (data.status === 'ERROR') {
              broadcast(jobId, 'error', data);
            } else {
              broadcast(jobId, 'transcribe_status', data);
            }
          } catch {
            broadcast(jobId, 'transcribe', { line });
          }
        }
      );

      if (!(await fs.pathExists(transcriptPath))) {
        broadcast(jobId, 'error', { message: 'Transcription failed, transcript.txt missing' });
        return;
      }

      broadcast(jobId, 'status', { status: 'summarizing', percent: 70 });
      const transcriptText = transcript || await fs.readFile(transcriptPath, 'utf8');

      let summary = '';
      // allow switching Ollama model via env var; default to the smaller/faster gemma3 model
      const ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:270m';
      // use resolved OLLAMA_CMD determined at server startup
      const ollamaCmd = OLLAMA_CMD;
      await run(
        ollamaCmd,
        ['run', ollamaModel, `Summarize this clearly:\n\n${transcriptText}`],
        jobDir,
        (line) => {
          summary += line;
          broadcast(jobId, 'ollama', { line });
        }
      );

      broadcast(jobId, 'status', { status: 'done', percent: 100 });
      broadcast(jobId, 'done', { transcript: transcriptText, summary });
    } catch (err) {
      broadcast(jobId, 'error', { message: err.message });
    }
  })();
});

app.get('/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) return res.sendStatus(404);

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.flushHeaders();
  startHeartbeat(res);

  job.clients.push(res);

  req.on('close', () => {
    job.clients = job.clients.filter((c) => c !== res);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
