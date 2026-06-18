/**
 * Client-side hook: fetch markdown content over HTTP.
 * Returns loading/error states for client components.
 */
"use client";

import { useState, useEffect } from "react";

interface MarkdownState {
  content: string;
  loading: boolean;
  error: string | null;
}

export function useMarkdown(url: string): MarkdownState {
  const [state, setState] = useState<MarkdownState>({
    content: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setState({ content: text, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ content: "", loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
