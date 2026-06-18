"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import "./Lightbox.css";

interface LightboxProps {
  images: { src: string; alt: string }[];
  initialIndex?: number;
  onClose: () => void;
}

export default function Lightbox({
  images,
  initialIndex = 0,
  onClose,
}: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 && initialIndex < images.length
      ? initialIndex
      : 0
  );
  const [isImageLoading, setIsImageLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const currentImage = images[currentIndex];

  const navigate = useCallback(
    (dir: number) => {
      setIsImageLoading(true);
      setCurrentIndex(
        (prev) => (prev + dir + images.length) % images.length
      );
    },
    [images.length]
  );

  const goToNext = useCallback(() => navigate(1), [navigate]);
  const goToPrev = useCallback(() => navigate(-1), [navigate]);

  // Focus management and body scroll lock on mount; restore on unmount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToNext, goToPrev]);

  // Tab trap within the overlay
  const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableEls = overlayRef.current?.querySelectorAll(
      focusableSelector
    );

    if (!focusableEls || focusableEls.length === 0) return;

    const first = focusableEls[0] as HTMLElement;
    const last = focusableEls[focusableEls.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  };

  if (!currentImage) return null;

  return (
    <div
      ref={overlayRef}
      className="lightbox-overlay"
      onClick={onClose}
      onKeyDown={handleOverlayKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        ref={closeButtonRef}
        className="lightbox-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close image viewer"
      >
        <span aria-hidden="true">✕</span>
      </button>

      <button
        className="lightbox-nav lightbox-nav-prev"
        onClick={(e) => {
          e.stopPropagation();
          goToPrev();
        }}
        aria-label="Previous image"
      >
        <span aria-hidden="true">‹</span>
      </button>

      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {isImageLoading && (
          <div className="lightbox-spinner" aria-hidden="true" />
        )}
        <img
          src={currentImage.src}
          alt={currentImage.alt}
          className={`lightbox-image${isImageLoading ? " loading" : ""}`}
          onLoad={() => setIsImageLoading(false)}
        />
      </div>

      <button
        className="lightbox-nav lightbox-nav-next"
        onClick={(e) => {
          e.stopPropagation();
          goToNext();
        }}
        aria-label="Next image"
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
