"use client";
import Link from "next/link";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import DraggableMarquee from "./DraggableMarquee";
import { ArrowUpRight } from "lucide-react";
export default function HomeGalleries({galleries, galleryImages, index}: {galleries: {id:string;title:string;imageCount:number}[];galleryImages: {src:string;alt:string}[][];index:string}) {return <>
      {/* Aperture (auto-discovered) */}
      {galleries.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
          <SectionHeading
            index={index}
            title="Aperture"
            description="Moments I have captured — moody, minimal, textured."
          />
          <div className="flex flex-col gap-10">
            {galleries.map((g, i) => {
              const imgs = galleryImages[i];
              if (!imgs?.length) return null;
              return (
                <Reveal key={g.id} delay={i * 70}>
                  <Link
                    href={`/aperture/${encodeURIComponent(g.id)}`}
                    className="group block"
                  >
                    <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground">
                      {g.title}
                      <span className="text-muted-foreground/50">
                        {g.imageCount} photos
                      </span>
                      <ArrowUpRight
                        size={13}
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </p>
                    <DraggableMarquee
                      label={`${g.title} photo marquee`}
                      speed={0.6}
                      repeatCount={2}
                      gapClassName="gap-4"
                      itemClassName="overflow-hidden rounded-xl border border-border"
                      deferredItemsUrl={`/api/gallery-preview?id=${encodeURIComponent(g.id)}`}
                      items={imgs.slice(0, 4).map((img) => ({
                        src: img.src,
                        alt: img.alt,
                        imageClassName:
                          "h-48 w-64 object-cover sm:h-56 sm:w-72",
                      }))}
                    />
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}
</>; }
