"use client";

import type { CSSProperties } from "react";
import { Prism as SyntaxHighlighter, type SyntaxHighlighterProps } from "react-syntax-highlighter";
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
  const theme: Record<string, CSSProperties> = {
    'code[class*="language-"]': {
      color: "var(--syntax-text)",
      background: "none",
      fontFamily: "var(--font-mono)",
      textAlign: "left",
      whiteSpace: "pre",
      wordSpacing: "normal",
      wordBreak: "normal",
      wordWrap: "normal",
      lineHeight: "1.5",
      tabSize: 2,
      hyphens: "none",
    },
    'pre[class*="language-"]': {
      color: "var(--syntax-text)",
      background: "transparent",
    },
    comment: { color: "var(--syntax-comment)", fontStyle: "italic" },
    prolog: { color: "var(--syntax-comment)" },
    doctype: { color: "var(--syntax-comment)" },
    cdata: { color: "var(--syntax-comment)" },
    punctuation: { color: "var(--syntax-subtext)" },
    property: { color: "var(--syntax-blue)" },
    tag: { color: "var(--syntax-red)" },
    boolean: { color: "var(--syntax-peach)" },
    number: { color: "var(--syntax-peach)" },
    constant: { color: "var(--syntax-peach)" },
    symbol: { color: "var(--syntax-peach)" },
    deleted: { color: "var(--syntax-red)" },
    selector: { color: "var(--syntax-green)" },
    'attr-name': { color: "var(--syntax-yellow)" },
    string: { color: "var(--syntax-green)" },
    char: { color: "var(--syntax-green)" },
    builtin: { color: "var(--syntax-teal)" },
    inserted: { color: "var(--syntax-green)" },
    operator: { color: "var(--syntax-sky)" },
    entity: { color: "var(--syntax-sky)", cursor: "help" },
    url: { color: "var(--syntax-sky)" },
    '.language-css .token.string': { color: "var(--syntax-sky)" },
    '.style .token.string': { color: "var(--syntax-sky)" },
    variable: { color: "var(--syntax-red)" },
    atrule: { color: "var(--syntax-blue)" },
    'attr-value': { color: "var(--syntax-green)" },
    function: { color: "var(--syntax-blue)" },
    'class-name': { color: "var(--syntax-yellow)" },
    keyword: { color: "var(--syntax-red)" },
    regex: { color: "var(--syntax-peach)" },
    important: { color: "var(--syntax-red)", fontWeight: "bold" },
    bold: { fontWeight: "bold" },
    italic: { fontStyle: "italic" },
    namespace: { opacity: 0.7 },
  };

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
          // no pre-hydration flash. Syntax colors resolve from the theme tokens.
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
