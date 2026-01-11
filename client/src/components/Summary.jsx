import { useState } from "react";

export default function Summary({ text }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="summary">
      <h2>Summary</h2>
      <pre>{text}</pre>
      <button onClick={copyToClipboard}>
        {copied ? "Copied!" : "Copy to Clipboard"}
      </button>
    </div>
  );
}
