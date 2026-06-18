"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { useMarkdown } from "@/hooks/useMarkdown";

export default function Projects() {
  const { content, loading, error } = useMarkdown("/content/projects.md");
  const router = useRouter();

  const handleLinkClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest("a");
    if (target && target.getAttribute("href")?.startsWith("/projects/")) {
      e.preventDefault();
      const path = target.getAttribute("href");
      if (path) router.push(path);
    }
  };

  if (loading) return <div className="common-container"><div className="inner-container"><p>Loading...</p></div></div>;
  if (error) return <div className="common-container"><div className="inner-container"><p>Error: {error}</p></div></div>;

  return (
    <div onClick={handleLinkClick}>
      <PageShell markdown={content} />
    </div>
  );
}
