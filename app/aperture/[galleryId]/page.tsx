import GalleryPageClient from "./GalleryPageClient";
import {
  getGalleries,
  getGalleryImages,
  SITE_URL,
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
  const url = `${SITE_URL}/aperture/${galleryId}`;
  const ogImageUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(
    gallery.title
  )}&subtitle=${encodeURIComponent("Lucas Hanson Photography")}`;
  return {
    title: `${gallery.title} Photography`,
    description: gallery.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${gallery.title} Photography`,
      description: gallery.description,
      url,
      images: [ogImageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: `${gallery.title} Photography`,
      description: gallery.description,
      images: [ogImageUrl],
    },
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
