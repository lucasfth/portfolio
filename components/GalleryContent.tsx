"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./GalleryContent.css";

interface GalleryContentProps {
  markdown: string;
  onImageClick?: (galleryId: string) => void;
}

export default function GalleryContent({
  markdown,
  onImageClick,
}: GalleryContentProps) {
  // helper to find an <img> tag anywhere in a HAST node tree
  function nodeContainsImage(node: any): boolean {
    if (!node || !node.children) return false;
    for (const child of node.children) {
      if (child && child.type === "element" && child.tagName === "img")
        return true;
      if (child && child.children && nodeContainsImage(child)) return true;
    }
    return false;
  }
  const lines = markdown.split("\n");
  const contentStart = lines.findIndex((line) => line.startsWith("---"));
  const remainingText =
    contentStart !== -1 ? lines.slice(contentStart + 1).join("\n") : "";

  const handleImageContainerClick = (href?: string) => {
    if (onImageClick && href) {
      const galleryId = href.split("/").pop();
      if (galleryId) onImageClick(galleryId);
    }
  };

  return (
    <div className="image-gallery-container">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }: any) => {
            const hasImage = nodeContainsImage(node);
            if (hasImage) {
              return <div className="image-wrapper">{props.children}</div>;
            }
            return (
              <div className="text-wrapper">
                <p {...props} />
              </div>
            );
          },
          a: ({ node, ...props }: any) => {
            // if this anchor wraps an image, render a block-level container
            const hasImage = node?.children?.some(
              (child: any) => child.tagName === "img"
            );
            if (hasImage) {
              return (
                <div
                  className="image-container"
                  onClick={() => handleImageContainerClick(props.href)}
                >
                  <a
                    {...props}
                    className="image-link"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  >
                    {props.children}
                  </a>
                </div>
              );
            }

            // otherwise render a normal inline anchor
            return <a {...props}>{props.children}</a>;
          },

          img: ({ node, ...props }: any) => (
            <figure className="image-figure">
              <img {...props} src={props.src} alt={props.alt || ""} />
              {props.title && (
                <figcaption className="caption">{props.title}</figcaption>
              )}
            </figure>
          ),
        }}
      >
        {remainingText}
      </ReactMarkdown>
    </div>
  );
}
