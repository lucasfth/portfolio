"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import Image from "next/image";
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
 * Shared markdown renderer (replaces the old TextSection).
 * - Renders markdown into the dark `.md-body` style.
 * - Internal links use next/link, external links open in a new tab.
 * - Code blocks get a copy button + theme-aware syntax highlighting.
 * - Images use next/image for optimization.
 */
export default function Markdown({ children }: { children: string }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    setIsDark(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const theme = isDark ? oneDark : oneLight;

  const renderCode = ({
    inline,
    className,
    children,
    ...props
  }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const codeContent = String(children).replace(/\n$/, "");
    if (!inline && match) {
      return (
        <div className="code-block-wrapper">
          <CopyButton text={codeContent} />
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
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {codeContent}
          </SyntaxHighlighter>
        </div>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  const renderAnchor = ({ href, children, ...props }: any) => {
    const isInternal =
      (typeof href === "string" && (href.startsWith("/") || href.startsWith("#"))) ||
      href === undefined;
    if (isInternal) {
      if (!href || href.startsWith("#")) {
        return (
          <a href={href || undefined} {...props}>
            {children}
          </a>
        );
      }
      return (
        <Link href={href} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  };

  const renderImage = ({ src, alt, ...props }: any) => {
    if (typeof src !== "string" || !src) {
      return <img src={src} alt={alt || ""} {...props} />;
    }
    // Allow local /images and absolute http(s) URLs.
    const isRemote = /^https?:\/\//.test(src);
    return (
      <span className="block">
        <Image
          src={src}
          alt={alt || ""}
          width={1200}
          height={800}
          style={{ width: "100%", height: "auto" }}
          sizes="(max-width: 768px) 100vw, 1200px"
          unoptimized={isRemote}
        />
      </span>
    );
  };

  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: renderAnchor,
          code: renderCode,
          img: renderImage,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
