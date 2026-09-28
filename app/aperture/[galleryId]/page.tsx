import GalleryPageClient from "./GalleryPageClient";
import {
  getGalleries,
  getGalleryImages,
  type Gallery,
} from "@/lib/content";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getGalleries().map((g) => ({ galleryId: g.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ galleryId: string }>;
}) {
  const { galleryId } = await params;
  const gallery = getGalleries().find((g) => g.id === galleryId);
  if (!gallery) return { title: "Gallery not found" };
  return {
    title: `${gallery.title} — Aperture`,
    description: gallery.description,
  };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ galleryId: string }>;
}) {
  const { galleryId } = await params;
  const gallery = getGalleries().find((g) => g.id === galleryId);
  if (!gallery) notFound();

  const images = await getGalleryImages(galleryId);

  return (
    <GalleryPageClient
      title={gallery.title}
      description={gallery.description}
      afterword={gallery.afterword}
      images={images}
    />
  );
}
