import { useState, useRef } from 'react';
import './App.css';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ status: '', percent: 0 });
  const esRef = useRef(null);

  const steps = [
    { name: 'Downloading', color: '#2196f3', key: 'downloading' },
    { name: 'Transcribing', color: '#ff9800', key: 'transcribing' },
    { name: 'Summarizing', color: '#4caf50', key: 'summarizing' },
    { name: 'Done', color: '#9e9e9e', key: 'done' },
  ];

  function handleSSE(jobId, progressUrl) {
    const es = new EventSource(`http://localhost:5000${progressUrl}`);
    esRef.current = es;

    es.addEventListener('status', (ev) => {
      try {
        const d = JSON.parse(ev.data);
        setProgress({ status: d.status, percent: d.percent || 0 });
      } catch {}
    });

    es.addEventListener('done', async (ev) => {
      try {
        const d = JSON.parse(ev.data);
        setTranscript(d.transcript || '');
        setSummary(d.summary || '');
      } catch {
        const r = await fetch(`http://localhost:5000/result/${jobId}`);
        const json = await r.json();
        setTranscript(json.transcript || '');
        setSummary(json.summary || '');
      } finally {
        es.close();
        setLoading(false);
        setProgress({ status: 'done', percent: 100 });
      }
    });

    es.addEventListener('error', (ev) => {
      try {
        const d = JSON.parse(ev.data);
        setError(d.message || 'Unknown error');
      } catch {}
      es.close();
      setLoading(false);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setTranscript(''); setSummary('');
    if (!url) return setError('Provide a YouTube URL.');
    setLoading(true);
    setProgress({ status: 'starting', percent: 0 });

    try {
      const res = await fetch('http://localhost:5000/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      handleSSE(data.jobId, data.progressUrl);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Determine how full each step is
  function getStepPercent(stepKey) {
    switch (stepKey) {
      case 'downloading': return progress.status === 'downloading' ? progress.percent : progress.status !== 'starting' ? 100 : 0;
      case 'transcribing': return progress.status === 'transcribing' ? progress.percent : progress.status === 'summarizing' || progress.status === 'done' ? 100 : 0;
      case 'summarizing': return progress.status === 'summarizing' ? progress.percent : progress.status === 'done' ? 100 : 0;
      case 'done': return progress.status === 'done' ? 100 : 0;
      default: return 0;
    }
  }

  return (
    <div className="app-root">
      <h1>YouTube Summarizer</h1>

      <form className="controls" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="https://youtube.com/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Working…' : 'Summarize'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="progress-bar-container">
          {steps.map((step) => (
            <div key={step.key} className="progress-step">
              <div className="step-label">{step.name}</div>
              <div className="step-bar">
                <div
                  className="step-fill"
                  style={{
                    width: `${getStepPercent(step.key)}%`,
                    backgroundColor: step.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="results">
        {transcript && (
          <div className="card">
            <h2>Transcript</h2>
            <pre className="scroll-box">{transcript}</pre>
            <div className="actions">
              <button onClick={() => downloadText('transcript.txt', transcript)}>Download</button>
            </div>
          </div>
        )}

        {summary && (
          <div className="card">
            <h2>Summary</h2>
            <pre className="scroll-box">{summary}</pre>
            <div className="actions">
              <button onClick={() => downloadText('summary.txt', summary)}>Download</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
