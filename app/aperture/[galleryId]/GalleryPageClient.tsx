"use client";

import { useState, useEffect } from "react";
import ImageHeader from "@/components/ImageHeader";
import "./GalleryPage.css";
import TextSection from "@/components/TextSection";

interface ImageData {
  src: string;
  alt: string;
}

interface GalleryPageClientProps {
  galleryId: string;
}

export default function GalleryPageClient({
  galleryId,
}: GalleryPageClientProps) {
  const [markdown, setMarkdown] = useState("");
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const navigate = (dir: number) => {
    const i = images.findIndex((img) => img.src === enlargedImage);
    if (i !== -1) setEnlargedImage(images[(i + dir + images.length) % images.length].src);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEnlargedImage(null);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft") navigate(-1);
    };
    if (enlargedImage) {
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [enlargedImage, images]);

  useEffect(() => {
    const getAssetPath = (path: string) => path;

    const locations = [
      `/content/aperture/${galleryId}.md`,
      `/content/galleries/${galleryId}.md`,
      `/aperture/${galleryId}.md`,
    ];

    const tryNextLocation = (index: number): Promise<string> => {
      if (index >= locations.length) {
        throw new Error(`Failed to load markdown for gallery: ${galleryId}`);
      }

      return fetch(locations[index]).then((response) => {
        if (!response.ok) {
          return tryNextLocation(index + 1);
        }
        return response.text();
      });
    };

    tryNextLocation(0)
      .then((text) => {
        setMarkdown(text);
        fetchGalleryImages(galleryId);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    const fetchGalleryImages = (folderName: string) => {
      fetch(`/images/${folderName}/manifest.json`)
        .then((response) => {
          if (!response.ok) throw new Error("Manifest not found");
          return response.json();
        })
        .then((data) => {
          if (data?.images) {
            setImages(data.images.map((img: string) => ({
              src: getAssetPath(`/images/${galleryId}/${img}`),
              alt: img.replace(/\.\w+$/, ""),
            })));
          } else throw new Error("No images in manifest");
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    };
  }, [galleryId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <ImageHeader markdown={markdown} />
      <div className="gallery-container">
        <div className="gallery-grid">
          {images.map((image, index) => (
            <button key={index} className="gallery-item" onClick={() => setEnlargedImage(image.src)} aria-label={`Enlarge image ${image.alt}`}>
              <img src={image.src} alt={image.alt} className="gallery-image" loading="lazy" />
            </button>
          ))}
        </div>
      </div>

      {enlargedImage && (
        <div className="overlay" onClick={() => setEnlargedImage(null)} role="dialog" aria-modal="true" aria-label="Enlarged image view">
          <button className="close-overlay" onClick={() => setEnlargedImage(null)} aria-label="Close enlarged image">✕</button>
          <button className="nav-button prev" onClick={(e) => { e.stopPropagation(); navigate(-1); }} aria-label="Previous image">‹</button>
          <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
            <img src={enlargedImage} alt="Enlarged" className="enlarged-image" />
          </div>
          <button className="nav-button next" onClick={(e) => { e.stopPropagation(); navigate(1); }} aria-label="Next image">›</button>
        </div>
      )}
      <TextSection markdown={markdown} />
    </div>
  );
}
