export default function Progress({ job, onCancel }) {
  const indeterminate = job.phase === "Transcribing" && (!job.phaseProgress || job.phaseProgress === 0);
  const isError = job.status === "failed" || job.error;
  const isCompleted = job.status === "completed";

  return (
    <div className={`progress ${isError ? 'error-state' : ''}`}>
      <p className="phase">{job.phase}</p>

      {!isError && (
        <div className="bar">
          <div
            className={`bar-fill ${indeterminate ? 'indeterminate' : ''}`}
            style={indeterminate ? {} : { width: `${job.phaseProgress}%` }}
          />
        </div>
      )}

      {isError && (
        <div className="error-display">
          <p className="error-label">⚠️ Job Failed</p>
          <p className="error-details">{job.error}</p>
        </div>
      )}

      {!isCompleted && job.phase !== "cancelled" && !isError && (
        <button
          className="cancel"
          onClick={() => {
            if (confirm("Cancel this job?")) onCancel(job.id);
          }}
          aria-label="Cancel job"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
