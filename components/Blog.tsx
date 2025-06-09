"use client";

import React from "react";
import Link from "next/link";
import ImageHeader from "./ImageHeader";
import TextSection from "./TextSection";

interface BlogProps {
  markdown: string;
}

function Blog({ markdown }: BlogProps) {
  const handleLinkClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    if (link && link.getAttribute("href")?.startsWith("/blog/")) {
      // Let Next.js handle the navigation
      return;
    }
  };

  return (
    <div onClick={handleLinkClick}>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />
    </div>
  );
}

export default Blog;
