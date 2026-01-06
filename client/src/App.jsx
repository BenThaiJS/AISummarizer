import { useState, useRef } from 'react'
import './App.css'

export default function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState([])
  const esRef = useRef(null)

  function appendProgress(line) {
    setProgress((p) => [...p, line].slice(-200))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setTranscript(''); setSummary(''); setProgress([])
    if (!url) return setError('Provide a YouTube URL.')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:5000/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error')

      const { jobId, progressUrl } = data
      appendProgress(`Job started: ${jobId}`)

      // open SSE connection
      const es = new EventSource(`http://localhost:5000${progressUrl}`)
      esRef.current = es
      es.addEventListener('status', (ev) => {
        try {
          const d = JSON.parse(ev.data)
          appendProgress(JSON.stringify(d))
        } catch (e) { appendProgress(ev.data) }
      })
      es.addEventListener('summarizing_chunk', (ev) => appendProgress(ev.data))
      es.addEventListener('done', async (ev) => {
        try {
          const d = JSON.parse(ev.data)
          setTranscript(d.transcript || '')
          setSummary(d.summary || '')
        } catch (e) {
          // fallback: fetch result endpoint
          const r = await fetch(`http://localhost:5000/result/${jobId}`)
          const json = await r.json()
          setTranscript(json.transcript || '')
          setSummary(json.summary || '')
        } finally {
          appendProgress('Job done')
          es.close()
          setLoading(false)
        }
      })
      es.addEventListener('error', (ev) => {
        try { const d = JSON.parse(ev.data); appendProgress('ERROR: '+(d.message||ev.data)) } catch(e){ appendProgress('ERROR') }
        es.close()
        setLoading(false)
      })

    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleUpload(file) {
    if (!file) return setError('Select a file to upload.')
    setError(''); setTranscript(''); setSummary(''); setProgress([])
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('http://localhost:5000/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      const { jobId, progressUrl } = data
      appendProgress(`Job started: ${jobId}`)

      const es = new EventSource(`http://localhost:5000${progressUrl}`)
      esRef.current = es
      es.addEventListener('status', (ev) => { try { const d = JSON.parse(ev.data); appendProgress(JSON.stringify(d)) } catch(e){ appendProgress(ev.data) } })
      es.addEventListener('done', async (ev) => {
        try { const d = JSON.parse(ev.data); setTranscript(d.transcript || ''); setSummary(d.summary || '') }
        catch (e) { const r = await fetch(`http://localhost:5000/result/${jobId}`); const json = await r.json(); setTranscript(json.transcript||''); setSummary(json.summary||'') }
        finally { appendProgress('Job done'); es.close(); setLoading(false) }
      })
      es.addEventListener('error', (ev) => { try { const d = JSON.parse(ev.data); appendProgress('ERROR: '+(d.message||ev.data)) } catch(e){ appendProgress('ERROR') } es.close(); setLoading(false) })

    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function copyToClipboard(text) {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(text)
  }

  return (
    <div id="root" className="app-root">
      <h1 className="title">YouTube Summarizer</h1>

      <form className="controls" onSubmit={handleSubmit}>
        <input
          className="input-url"
          type="text"
          placeholder="https://youtube.com/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Working…' : 'Summarize'}
        </button>

        <label className="upload-label">
          <input type="file" className="input-file" onChange={(e) => handleUpload(e.target.files && e.target.files[0])} />
          <span className="small">Upload & Summarize</span>
        </label>
      </form>

      {error && <p className="error">{error}</p>}

      {progress.length > 0 && (
        <div className="card progress-card">
          <h3>Progress</h3>
          <div className="progress-box">
            {progress.map((p, i) => <div key={i} className="progress-line">{p}</div>)}
          </div>
        </div>
      )}

      {summary && (
        <div className="card result-card">
          <div className="result-header">
            <h2>Summary</h2>
            <div className="actions">
              <button className="small" onClick={() => downloadText('summary.txt', summary)}>Download</button>
              <button className="small" onClick={() => copyToClipboard(summary)}>Copy</button>
            </div>
          </div>
          <pre className="result-box">{summary}</pre>
        </div>
      )}

      {transcript && (
        <div className="card result-card">
          <div className="result-header">
            <h2>Transcript</h2>
            <div className="actions">
              <button className="small" onClick={() => downloadText('transcript.txt', transcript)}>Download</button>
              <button className="small" onClick={() => copyToClipboard(transcript)}>Copy</button>
            </div>
          </div>
          <pre className="result-box">{transcript}</pre>
        </div>
      )}
    </div>
  )
}
