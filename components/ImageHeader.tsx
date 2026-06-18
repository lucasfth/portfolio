import React from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import "./ImageHeader.css";

interface ImageHeaderProps {
  markdown: string;
}

export default function ImageHeader({ markdown }: ImageHeaderProps) {
  if (!markdown) {
    return <div>No content available</div>;
  }

  const lines = markdown.split("\n");
  const headerImage = lines.find((line) => line.startsWith("![header]"));
  const profileImage = lines.find((line) => line.includes("profile picture"));
  const firstHeading = lines.find((line) => line.startsWith("# "));
  const firstParagraph = lines.find(
    (line) =>
      !line.startsWith("![") && !line.startsWith("#") && line.trim() !== ""
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Header Image with Darkening Filter */}
      <div className="image-header-hero">
        {headerImage && (
          <>
            <ReactMarkdown
              components={{
                img: ({ src, alt, ...props }) => (
                  <Image
                    src={src || ""}
                    alt={alt || ""}
                    fill
                    style={{
                      objectFit: "cover",
                      filter: "brightness(50%) grayscale(100%)",
                    }}
                    sizes="100vw"
                    priority
                  />
                ),
              }}
            >
              {headerImage}
            </ReactMarkdown>
          </>
        )}

        {/* Content positioned over the background */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100%",
            maxWidth: "1200px",
            padding: "0 20px",
            color: "white",
            zIndex: 2,
          }}
        >
          <div className="content-container">
            {profileImage && (
              <div className="profile-image-container">
                <ReactMarkdown
                  components={{
                    img: ({ src, alt, ...props }) => (
                      <Image
                        src={src || ""}
                        alt={alt || ""}
                        width={300}
                        height={300}
                        style={{
                          width: "100%",
                          height: "auto",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }}
                        sizes="300px"
                      />
                    ),
                  }}
                >
                  {profileImage}
                </ReactMarkdown>
              </div>
            )}
            <div className="text-container">
              {firstHeading && (
                <div
                  style={{
                    fontSize: "2rem",
                    marginBottom: "1rem",
                  }}
                >
                  <ReactMarkdown>{firstHeading}</ReactMarkdown>
                </div>
              )}
              {firstParagraph && (
                <div style={{ fontSize: "1.2rem" }}>
                  <ReactMarkdown>{firstParagraph}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
