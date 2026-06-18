"use client";

import PageShell from "@/components/PageShell";

interface ProjectDetailClientProps {
  markdown: string;
}

export default function ProjectDetailClient({ markdown }: ProjectDetailClientProps) {
  return <PageShell markdown={markdown} />;
}
