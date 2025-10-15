"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageHeader from "@/components/ImageHeader";
import GalleryContent from "@/components/GalleryContent";

export default function Aperture() {
  const [markdown, setMarkdown] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/content/aperture.md")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.text();
      })
      .then((text) => {
        setMarkdown(text);
      })
      .catch((err) => console.error("Error loading markdown:", err));
  }, []);

  const handleImageClick = (galleryId: string) => {
    router.push(`/aperture/${galleryId}`);
  };

  return (
    <>
      <ImageHeader markdown={markdown} />
      <GalleryContent markdown={markdown} onImageClick={handleImageClick} />
    </>
  );
}
