"use client";

import PageShell from "@/components/PageShell";
import { useMarkdown } from "@/hooks/useMarkdown";

export default function Projects() {
  const { content, loading, error } = useMarkdown("/content/projects.md");

  if (loading) return <div className="common-container"><div className="inner-container"><p>Loading...</p></div></div>;
  if (error) return <div className="common-container"><div className="inner-container"><p>Error: {error}</p></div></div>;

  return (
    <PageShell markdown={content} />
  );
}
