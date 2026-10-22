"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Gallery } from "@/lib/content";

/**
 * Auto-generated aperture gallery tile (cover + title + count).
 */
export default function GalleryTile({ gallery, reveal = false }: { gallery: Gallery; reveal?: boolean }) {
  return (
    <Link
      href={`/aperture/${encodeURIComponent(gallery.id)}`}
      className="group relative block overflow-hidden rounded-[var(--media-radius)] border border-border"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden" data-terminal-media={reveal || undefined}>
        {gallery.cover && (
          <Image
            src={gallery.cover}
            alt={gallery.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="font-heading text-2xl tracking-tight text-white">{gallery.title}</h3>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
          {gallery.imageCount} {gallery.imageCount === 1 ? "photo" : "photos"}
        </p>
      </div>
    </Link>
  );
}
