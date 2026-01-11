export default function Progress({ job, onCancel }) {
  const indeterminate = job.phase === "Transcribing" && (!job.phaseProgress || job.phaseProgress === 0);

  return (
    <div className="progress">
      <p className="phase">{job.phase}</p>

      <div className="bar">
        <div
          className={`bar-fill ${indeterminate ? 'indeterminate' : ''}`}
          style={indeterminate ? {} : { width: `${job.phaseProgress}%` }}
        />
      </div>

      {job.status !== "completed" && job.phase !== "cancelled" && (
        <button
          className="cancel"
          onClick={() => {
            if (confirm("Cancel this job?")) onCancel(job.id);
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
