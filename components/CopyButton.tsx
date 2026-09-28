"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable — ignore.
    }
  };

  return (
    <button
      type="button"
      className="copy-button flex items-center gap-1.5"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
