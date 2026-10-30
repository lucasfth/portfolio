"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import ImageMarquee from "./ImageMarquee";

export default function HomeGalleries({ galleries, galleryImages, index }: {
  galleries: { id: string; title: string; imageCount: number }[];
  galleryImages: { src: string; alt: string }[][];
  index: string;
}) {
  if (!galleries.length) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
      <SectionHeading index={index} title="Aperture" description="Moments I have captured — moody, minimal, textured." />
      <div className="flex flex-col gap-10">
        {galleries.map((gallery, i) => {
          const images = galleryImages[i];
          if (!images?.length) return null;
          const href = `/aperture/${encodeURIComponent(gallery.id)}`;
          return (
            <Reveal key={gallery.id} delay={i * 70}>
              <Link href={href} className="group mb-3 inline-flex min-h-9 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-accent">
                {gallery.title}
                <span className="text-muted-foreground">{gallery.imageCount} photos</span>
                <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <ImageMarquee
                label={`${gallery.title} photo slideshow`}
                href={href}
                deferredItemsUrl={`/api/gallery-preview?id=${encodeURIComponent(gallery.id)}`}
                items={images.slice(0, 4)}
              />
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
