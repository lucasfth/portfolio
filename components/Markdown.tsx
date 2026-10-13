import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import Image from "next/image";
import CodeBlock from "./LazyCodeBlock";
import Mermaid from "./Mermaid";

/**
 * Shared markdown renderer (replaces the old TextSection).
 * Server component: react-markdown never ships to the browser. Only the
 * interactive leaves (CodeBlock, Mermaid) are client components.
 * - Internal links use next/link, external links open in a new tab.
 * - Images use next/image for optimization.
 */
export default function Markdown({ children }: { children: string }) {
  const renderCode = ({
    inline,
    className,
    children,
    node: _node,
    ...props
  }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const codeContent = String(children).replace(/\n$/, "");
    if (!inline && match?.[1] === "mermaid") {
      return <Mermaid chart={codeContent} />;
    }
    if (!inline && match) {
      return <CodeBlock language={match[1]} code={codeContent} />;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  const renderAnchor = ({ href, children, node: _node, ...props }: any) => {
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

  const renderImage = ({ src, alt, node: _node, ...props }: any) => {
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
