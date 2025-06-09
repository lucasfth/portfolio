import { Metadata } from "next";
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import GalleryPageComponent from "../../../components/GalleryPage";

interface GalleryPageProps {
  params: Promise<{ galleryId: string }>;
}

const galleryMetadata: Record<string, { title: string; description: string }> =
  {
    snow: {
      title: "Snow Gallery - Winter Photography",
      description:
        "A collection of snow-covered landscapes and winter scenes captured through my lens.",
    },
    urban: {
      title: "Urban Gallery - City Photography",
      description:
        "Urban photography capturing moments from slow walks through the city, finding breathing room in everyday business.",
    },
    uni: {
      title: "University Gallery - Campus Life",
      description:
        "Photography from university events and organizations, including moments from CaptureIT photography club.",
    },
    nature: {
      title: "Nature Gallery - Natural Landscapes",
      description:
        "Fascinating contrasts between nature and human-made objects captured in various natural settings.",
    },
  };

export async function generateMetadata({
  params,
}: GalleryPageProps): Promise<Metadata> {
  const { galleryId } = await params;
  const gallery = galleryMetadata[galleryId];

  if (!gallery) {
    return {
      title: "Gallery Not Found",
      description: "The requested gallery could not be found.",
    };
  }

  return {
    title: `${gallery.title} - Lucas Hanson`,
    description: gallery.description,
  };
}

export async function generateStaticParams() {
  return [
    { galleryId: "snow" },
    { galleryId: "urban" },
    { galleryId: "uni" },
    { galleryId: "nature" },
  ];
}

async function getMarkdownContent(galleryId: string) {
  const filePath = path.join(
    process.cwd(),
    "public",
    "content",
    "aperture",
    `${galleryId}.md`
  );

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return fileContent;
  } catch (error) {
    return null;
  }
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { galleryId } = await params;
  const markdown = await getMarkdownContent(galleryId);

  if (!markdown) {
    notFound();
  }

  return <GalleryPageComponent galleryId={galleryId} markdown={markdown} />;
}
