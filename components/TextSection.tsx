"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  materialLight,
  materialDark,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import CopyButton from "./CopyButton";

interface TextSectionProps {
  markdown: string;
}

export default function TextSection({ markdown }: TextSectionProps) {
  const lines = markdown.split("\n");
  const contentStart = lines.findIndex((line) => line.startsWith("---"));
  const remainingText =
    contentStart !== -1 ? lines.slice(contentStart + 1).join("\n") : "";

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const theme = isDark ? materialDark : materialLight;

  return (
    <div className="common-container">
      <div className="inner-container">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              const codeContent = String(children).replace(/\n$/, "");
              return !inline && match ? (
                <div className="code-block-wrapper">
                  <CopyButton text={codeContent} />
                  <SyntaxHighlighter
                    style={{
                      ...theme,
                      'pre[class*="language-"]': {
                        ...theme['pre[class*="language-"]'],
                        borderRadius: "8px",
                      },
                    }}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {codeContent}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {remainingText}
        </ReactMarkdown>
      </div>
    </div>
  );
}
