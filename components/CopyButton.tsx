"use client";
import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <>
      <button onClick={handleCopy} className="copy-button" aria-label={copied ? "Copied!" : "Copy code"}>
        {copied ? "✓ Copied" : "Copy"}
      </button>
      <div className="sr-only" aria-live="polite">
        {copied ? "Code copied to clipboard" : ""}
      </div>
    </>
  );
}
