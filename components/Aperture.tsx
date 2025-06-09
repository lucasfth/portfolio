"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ImageHeader from "./ImageHeader";
import GalleryContent from "./GalleryContent";

interface ApertureProps {
  markdown: string;
}

function Aperture({ markdown }: ApertureProps) {
  const router = useRouter();

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

export default Aperture;
