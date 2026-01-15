import { useEffect, useRef, useState } from "react";
import Progress from "./components/Progress";
import Result from "./components/Result";
import ErrorMessage from "./components/ErrorMessage";
import { validateYouTubeURL } from "./utils/validateUrl";
import "./App.css";

export default function App() {
  const [job, setJob] = useState(null);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef(null);

  // ---------------------------
  // Handle URL input change with validation
  // ---------------------------
  const handleUrlChange = (e) => {
    const value = e.target.value;
    setUrl(value);

    // Validate on change for real-time feedback
    if (value.trim()) {
      const validation = validateYouTubeURL(value);
      setUrlError(validation.error || "");
    } else {
      setUrlError("");
    }
  };

  // ---------------------------
  // Start a new job
  // ---------------------------
  const start = async () => {
    // Validate URL before sending
    const validation = validateYouTubeURL(url);
    if (!validation.isValid) {
      setUrlError(validation.error);
      return;
    }

    setIsLoading(true);
    setUrlError("");

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      // Handle server-side validation errors
      if (!res.ok) {
        setUrlError(data.error || "Failed to start job");
        setIsLoading(false);
        return;
      }

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
    } catch (error) {
      setUrlError("Network error: " + error.message);
    } finally {
      setIsLoading(false);
    }
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
  // Reset job state
  // ---------------------------
  const resetJob = () => {
    setJob(null);
    setUrl("");
    setUrlError("");
    wsRef.current?.close();
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="app">
      <h1>YouTube Summarizer</h1>

      {!job && (
        <>
          <div className="input-container">
            <input
              placeholder="Paste YouTube URL (youtube.com or youtu.be)"
              value={url}
              onChange={handleUrlChange}
              onKeyDown={(e) => e.key === "Enter" && start()}
              disabled={isLoading}
              aria-label="YouTube URL input"
            />
            <button
              className="start"
              onClick={start}
              disabled={isLoading || !url.trim() || urlError !== ""}
              aria-label="Start summarization"
            >
              {isLoading ? "Loading..." : "Summarize"}
            </button>
          </div>
          {urlError && <ErrorMessage error={urlError} />}
        </>
      )}

      {job && (
        <>
          <Progress job={job} onCancel={cancelJob} />
          {(job.status === "failed" || job.error) && (
            <button className="retry-button" onClick={resetJob}>
              ← Try Another URL
            </button>
          )}
        </>
      )}

      {job?.result && !job?.error && <Result result={job.result} />}

      {job && (job.status === "failed" || job.error) && (
        <button className="retry-button" onClick={resetJob} style={{ marginTop: "16px" }}>
          ← Try Another URL
        </button>
      )}
    </div>
  );
}
