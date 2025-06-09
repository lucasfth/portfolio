"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./GalleryContent.css";

interface GalleryContentProps {
  markdown: string;
  onImageClick?: (galleryId: string) => void;
}

function GalleryContent({ markdown, onImageClick }: GalleryContentProps) {
  const lines = markdown.split("\n");
  const contentStart = lines.findIndex((line) => line.startsWith("---"));
  const remainingText =
    contentStart !== -1 ? lines.slice(contentStart + 1).join("\n") : "";

  const handleImageContainerClick = (href: string) => {
    if (onImageClick && href) {
      const galleryId = href.split("/").pop();
      if (galleryId) {
        onImageClick(galleryId);
      }
    }
  };

  return (
    <div className="image-gallery-container">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Always render paragraphs as divs to avoid nesting issues
          p: ({ children }) => {
            return <div className="markdown-paragraph">{children}</div>;
          },
          a: ({ href, children }) => {
            return (
              <div
                className="image-container"
                onClick={() => href && handleImageContainerClick(href)}
              >
                <span
                  className="image-link"
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  {children}
                </span>
              </div>
            );
          },
          img: ({ src, alt, title }) => {
            return (
              <div className="image-wrapper">
                <img src={src} alt={alt || ""} />
                {title && <div className="caption">{title}</div>}
              </div>
            );
          },
        }}
      >
        {remainingText}
      </ReactMarkdown>
    </div>
  );
}

export default GalleryContent;
