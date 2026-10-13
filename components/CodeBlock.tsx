"use client";

import { useEffect, useState } from "react";
import {
  Prism as SyntaxHighlighter,
  type SyntaxHighlighterProps,
} from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import CopyButton from "./CopyButton";

/**
 * Highlighted code block. Client-only so Prism ships only on pages that
 * actually render code, never on the homepage.
 */
export default function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    setIsDark(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const theme = isDark ? oneDark : oneLight;

  return (
    <div className="code-block-wrapper">
      <CopyButton text={code} />
      <SyntaxHighlighter
        style={{
          ...theme,
          // NOTE: the selector key must match the theme's exact key
          // (double-quoted attribute) or the override lands on a phantom
          // key and the theme's inline background wins. We force the
          // container transparent so the .code-block-wrapper CSS owns the
          // background — pure CSS, so it follows prefers-color-scheme with
          // no pre-hydration flash. Token colors still come from `theme`.
          'pre[class*="language-"]': {
            ...theme['pre[class*="language-"]'],
            background: "transparent",
            borderRadius: "0",
          },
        } as SyntaxHighlighterProps["style"]}
        language={language}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
