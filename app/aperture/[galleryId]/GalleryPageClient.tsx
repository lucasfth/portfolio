"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Lightbox from "@/components/Lightbox";
import Markdown from "@/components/Markdown";
import { ArrowLeft, Camera } from "lucide-react";
import type { GalleryImage } from "@/lib/content";
import "./GalleryPage.css";

interface GalleryPageClientProps {
  title: string;
  description: string;
  afterword?: string;
  images: GalleryImage[];
}

export default function GalleryPageClient({
  title,
  description,
  afterword,
  images,
}: GalleryPageClientProps) {
  const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);

  return (
    <>
      <header className="relative px-6 pt-32 pb-10 sm:pt-40">
        <div className="mx-auto w-full max-w-4xl">
          <Link
            href="/aperture"
            className="group mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft
              size={14}
              className="transition-transform group-hover:-translate-x-1"
            />
            Aperture
          </Link>
          <h1 className="font-hand text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          <p className="mt-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground/70">
            <Camera size={14} />
            {images.length} {images.length === 1 ? "photo" : "photos"}
          </p>
          {afterword && (
            <div className="mt-6 max-w-xl text-sm text-muted-foreground">
              <Markdown>{afterword}</Markdown>
            </div>
          )}
        </div>
      </header>

      <div className="gallery-container pb-20">
        <div className="gallery-grid">
          {images.map((image, index) => (
            <button
              key={image.src}
              className="gallery-item"
              onClick={() => setEnlargedIndex(index)}
              aria-label={`Enlarge image ${image.alt}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={800}
                height={600}
                sizes="(max-width: 600px) 100vw, (max-width: 800px) 50vw, 25vw"
                className="gallery-image"
              />
              {image.camera || image.date ? (
                <span className="gallery-meta">
                  {image.camera ?? ""}
                  {image.camera && image.date ? " · " : ""}
                  {image.date ?? ""}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {enlargedIndex !== null && (
        <Lightbox
          images={images}
          initialIndex={enlargedIndex}
          onClose={() => setEnlargedIndex(null)}
        />
      )}
    </>
  );
}
