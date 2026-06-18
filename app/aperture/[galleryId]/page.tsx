import GalleryPageClient from './GalleryPageClient'
import { readMarkdown } from "@/hooks/readMarkdown";
import { getGalleryIds, getGalleryImages } from "@/hooks/useGalleryImages";

export function generateStaticParams() {
  return getGalleryIds().map((galleryId) => ({ galleryId }));
}

export default async function GalleryPage({ params }: { params: Promise<{ galleryId: string }> }) {
  const { galleryId } = await params;
  const markdown = readMarkdown(`content/aperture/${galleryId}.md`);
  const images = getGalleryImages(galleryId);
  return <GalleryPageClient markdown={markdown} images={images} />;
}
