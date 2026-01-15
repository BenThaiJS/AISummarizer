/**
 * Error message display component
 */
export default function ErrorMessage({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="error-container">
      <div className="error-message">
        <div className="error-header">
          <span className="error-icon">⚠️</span>
          <span className="error-title">Error</span>
        </div>
        <p className="error-text">{error}</p>
        {onDismiss && (
          <button className="error-dismiss" onClick={onDismiss} aria-label="Dismiss error">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
