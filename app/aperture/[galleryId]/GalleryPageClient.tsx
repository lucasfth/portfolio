"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "@/components/Lightbox";
import PageShell from "@/components/PageShell";
import "./GalleryPage.css";

interface ImageData {
  src: string;
  alt: string;
}

interface GalleryPageClientProps {
  markdown: string;
  images: ImageData[];
}

export default function GalleryPageClient({ markdown, images }: GalleryPageClientProps) {
  const [enlargedImage, setEnlargedImage] = useState<ImageData | null>(null);

  return (
    <PageShell markdown={markdown}>
      <div className="gallery-container">
        <div className="gallery-grid">
          {images.map((image, index) => (
            <button
              key={index}
              className="gallery-item"
              onClick={() => setEnlargedImage(image)}
              aria-label={`Enlarge image ${image.alt}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={800}
                height={600}
                sizes="(max-width: 600px) 100vw, (max-width: 800px) 50vw, 25vw"
                className="gallery-image"
                style={{ width: "100%", height: "auto" }}
              />
            </button>
          ))}
        </div>
      </div>

      {enlargedImage && (
        <Lightbox
          images={images}
          initialIndex={images.findIndex((img) => img.src === enlargedImage.src)}
          onClose={() => setEnlargedImage(null)}
        />
      )}
    </PageShell>
  );
}
