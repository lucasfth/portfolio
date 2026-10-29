"use client";

import { useLayoutEffect, useRef, useState } from "react";
import TerminalReveal from "@/components/TerminalReveal";

/** Text only: source stays in normal flow; decorative ASCII cannot leave this field. */
export default function AdminField({ text, loading = false }: { text: string; loading?: boolean }) {
  const field = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontRevision, setFontRevision] = useState(0);
  useLayoutEffect(() => {
    let alive = true;
    const measure = () => {
      if (!alive || !field.current?.isConnected) return;
      const root = field.current;
      const reserved = root.style.minHeight;
      root.style.minHeight = "";
      const { width, height } = root.getBoundingClientRect();
      root.style.minHeight = reserved;
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    const fontsChanged = () => { measure(); if (alive) setFontRevision(revision => revision + 1); };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (field.current) observer?.observe(field.current);
    document.fonts?.addEventListener("loadingdone", fontsChanged);
    void document.fonts?.ready.then(fontsChanged);
    return () => { alive = false; observer?.disconnect(); document.fonts?.removeEventListener("loadingdone", fontsChanged); };
  }, [text]);
  return <div ref={field} className="admin-field" data-loading={loading} style={{ minHeight: size.height || undefined }}>
    <TerminalReveal key={text} revision={loading ? `${size.width}:${size.height}:${fontRevision}` : ""} loading={loading} loadingLoop={loading}>
      <span className="admin-field-text">{text || "No data"}</span>
    </TerminalReveal>
  </div>;
}
