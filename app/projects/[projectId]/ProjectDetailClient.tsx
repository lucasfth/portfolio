"use client";

import TextSection from "@/components/TextSection";
import ImageHeader from "@/components/ImageHeader";

interface ProjectDetailClientProps {
  markdown: string;
}

export default function ProjectDetailClient({
  markdown,
}: ProjectDetailClientProps) {
  return (
    <>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />
    </>
  );
}
