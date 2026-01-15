import { useEffect, useRef, useState } from "react";
import Progress from "./components/Progress";
import Summary from "./components/Summary";
import "./App.css";

export default function App() {
  const [job, setJob] = useState(null);
  const [url, setUrl] = useState("");
  const wsRef = useRef(null);

  // ---------------------------
  // Start a new job
  // ---------------------------
  const start = async () => {
    if (!url.trim()) return;

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    setJob({
      id: data.id,
      status: data.status,
      phase: data.phase || "starting",
      phaseProgress: data.phaseProgress || 0,
      overallProgress: data.overallProgress || 0,
      result: data.result || null,
      error: data.error || null,
    });

    setUrl(""); // Clear input after starting job
  };

  // ---------------------------
  // Cancel job
  // ---------------------------
  const cancelJob = async () => {
    if (!job?.id) return;

    await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" });

    setJob((j) =>
      j
        ? {
            ...j,
            phase: "cancelled",
            phaseProgress: 100,
          }
        : j
    );

    wsRef.current?.close();
  };

  // ---------------------------
  // WebSocket lifecycle
  // ---------------------------
  useEffect(() => {
    if (!job?.id) return;

    const ws = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/${job.id}`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      // subscribe so server can send job-specific updates
      try {
        ws.send(JSON.stringify({ type: "subscribe", jobId: job.id }));
      } catch (e) {
        console.error("WebSocket subscribe error", e);
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      // server broadcasts { type: 'job:update', job }
      if (msg.type === "job:update" && msg.job) {
        setJob((prev) => ({
          ...(prev || {}),
          id: msg.job.id,
          status: msg.job.status,
          phase: msg.job.phase,
          phaseProgress: msg.job.phaseProgress,
          overallProgress: msg.job.overallProgress,
          result: msg.job.result,
          error: msg.job.error,
        }));
        return;
      }

      // backwards-compatible message types
      setJob((prev) => {
        if (!prev) return prev;
        switch (msg.type) {
          case "status":
            return { ...prev, phase: msg.status, phaseProgress: msg.percent };
          case "done":
            return { ...prev, phase: "completed", phaseProgress: 100, result: msg.summary };
          case "error":
            return { ...prev, phase: "error", error: msg.error || null };
          default:
            return prev;
        }
      });
    };

    ws.onerror = () => console.error("WebSocket error");
    ws.onclose = () => (wsRef.current = null);

    return () => ws.close();
  }, [job?.id]);

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="app">
      <h1>YouTube Summarizer</h1>

      {!job && (
        <div className="input-container">
          <input
            placeholder="Paste YouTube URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && start()}
          />
          <button className="start" onClick={start}>
            Summarize
          </button>
        </div>
      )}

      {job && <Progress job={job} onCancel={cancelJob} />}
      {job?.result && <Summary text={job.result} />}
    </div>
  );
}
