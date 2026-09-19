"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!successful) throw new Error("execCommand failed");
      }
      setCopied(true);
      setError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
      setCopied(false);
      setTimeout(() => setError(false), 2000);
    }
  };

  const label = error ? "Failed to copy" : copied ? "Copied!" : "Copy code";
  const tooltip = error
    ? "Failed to copy code to clipboard"
    : copied
    ? "Copied to clipboard"
    : "Copy code to clipboard";

  return (
    <>
      <button
        onClick={handleCopy}
        className="copy-button"
        aria-label={label}
        title={tooltip}
      >
        {error ? "✕ Error" : copied ? "✓ Copied" : "Copy"}
      </button>
      <div className="sr-only" aria-live="polite">
        {error
          ? "Failed to copy code to clipboard"
          : copied
          ? "Code copied to clipboard"
          : ""}
      </div>
    </>
  );
}
