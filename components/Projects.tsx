"use client";

import React from "react";
import Link from "next/link";
import ImageHeader from "./ImageHeader";
import TextSection from "./TextSection";

interface ProjectsProps {
  markdown: string;
}

function Projects({ markdown }: ProjectsProps) {
  const handleLinkClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    if (link && link.getAttribute("href")?.startsWith("/projects/")) {
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

export default Projects;
