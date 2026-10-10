"use client";

import React, { useEffect, useId, useState } from "react";

/**
 * Renders a ```mermaid fenced block as an SVG diagram.
 * Mermaid is imported lazily so pages without diagrams never load it.
 * Until it renders (or if it fails) the raw source is shown as a code block.
 */
export default function Mermaid({ chart }: { chart: string }) {
  const id = "mermaid-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const mq = window.matchMedia("(prefers-color-scheme: light)");

    const draw = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: mq.matches ? "neutral" : "dark",
          fontFamily: "inherit",
        });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setSvg(null);
      }
    };

    draw();
    mq.addEventListener("change", draw);
    return () => {
      cancelled = true;
      mq.removeEventListener("change", draw);
    };
  }, [chart, id]);

  if (!svg) {
    return (
      <code className="mermaid-fallback">{chart}</code>
    );
  }

  return (
    <div
      className="mermaid-diagram"
      role="img"
      aria-label="Diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
