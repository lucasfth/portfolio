"use client";

import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import GalleryContent from "@/components/GalleryContent";
import { useMarkdown } from "@/hooks/useMarkdown";

export default function Aperture() {
  const { content, loading, error } = useMarkdown("/content/aperture.md");
  const router = useRouter();

  const handleImageClick = (galleryId: string) => {
    router.push(`/aperture/${galleryId}`);
  };

  if (loading) return <div className="common-container"><div className="inner-container"><p>Loading...</p></div></div>;
  if (error) return <div className="common-container"><div className="inner-container"><p>Error: {error}</p></div></div>;

  return (
    <>
      <PageShell markdown={content}>
        <GalleryContent markdown={content} onImageClick={handleImageClick} />
      </PageShell>
    </>
  );
}
