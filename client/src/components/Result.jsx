import { useState } from "react";

export default function Result({ result }) {
  const [activeTab, setActiveTab] = useState("summary"); // "summary" or "transcript"

  if (!result) return null;

  // Handle both old format (string) and new format (object with transcript & summary)
  const transcript = typeof result === "string" ? "" : result.transcript;
  const summary = typeof result === "string" ? result : result.summary;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const downloadAsFile = (text, filename) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="result-container">
      {/* Tab Navigation */}
      <div className="result-tabs">
        <button
          className={`tab-button ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => setActiveTab("summary")}
          aria-label="Show summary"
        >
          Summary
        </button>
        {transcript && (
          <button
            className={`tab-button ${activeTab === "transcript" ? "active" : ""}`}
            onClick={() => setActiveTab("transcript")}
            aria-label="Show transcript"
          >
            Transcript
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="result-content">
        {activeTab === "summary" && (
          <div className="tab-pane">
            <h2>Summary</h2>
            <pre className="result-text">{summary}</pre>
            <div className="result-actions">
              <button
                className="action-button copy-button"
                onClick={() => copyToClipboard(summary)}
                title="Copy summary to clipboard"
              >
                📋 Copy Summary
              </button>
              <button
                className="action-button download-button"
                onClick={() => downloadAsFile(summary, "summary.txt")}
                title="Download summary as text file"
              >
                ⬇️ Download Summary
              </button>
            </div>
          </div>
        )}

        {activeTab === "transcript" && transcript && (
          <div className="tab-pane">
            <h2>Transcript</h2>
            <pre className="result-text">{transcript}</pre>
            <div className="result-actions">
              <button
                className="action-button copy-button"
                onClick={() => copyToClipboard(transcript)}
                title="Copy transcript to clipboard"
              >
                📋 Copy Transcript
              </button>
              <button
                className="action-button download-button"
                onClick={() => downloadAsFile(transcript, "transcript.txt")}
                title="Download transcript as text file"
              >
                ⬇️ Download Transcript
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
