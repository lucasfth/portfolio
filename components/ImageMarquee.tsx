"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

type MarqueeItem = { src: string; alt?: string };

/** Native horizontal scrolling with optional autoplay; manual input always wins. */
export default function ImageMarquee({ items: initialItems, deferredItemsUrl, label, href }: {
  items: MarqueeItem[];
  deferredItemsUrl?: string;
  label: string;
  href?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!deferredItemsUrl) return;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const load = async () => {
      try {
        const response = await fetch(deferredItemsUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Gallery unavailable");
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.length || data.some(item => !item || typeof item.src !== "string")) throw new Error("Invalid gallery response");
        if (!controller.signal.aborted) setItems(data);
      } catch {
        if (!controller.signal.aborted && attempts++ < 3) retry = setTimeout(load, 1000 * 2 ** attempts);
      }
    };
    void load();
    window.addEventListener("online", load);
    return () => { controller.abort(); clearTimeout(retry); window.removeEventListener("online", load); };
  }, [deferredItemsUrl]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !motionAllowed || paused || hovered || focused || !visible || !items.length) return;
    let frame: number | undefined;
    let previous: number | undefined;
    let position = viewport.scrollLeft;
    const tick = (time: number) => {
      const first = track.children[0] as HTMLElement | undefined;
      const copy = track.children[items.length] as HTMLElement | undefined;
      const width = first && copy ? copy.offsetLeft - first.offsetLeft : 0;
      // Accumulate fractional pixels independently of browser scrollLeft rounding.
      if (previous !== undefined && width > viewport.clientWidth) {
        position = (position + Math.min(time - previous, 64) * 0.036) % width;
        viewport.scrollLeft = position;
      }
      previous = time;
      frame = requestAnimationFrame(tick);
    };
    const cancel = () => { if (frame !== undefined) cancelAnimationFrame(frame); frame = undefined; previous = undefined; };
    const visibility = () => { cancel(); if (!document.hidden) frame = requestAnimationFrame(tick); };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => { cancel(); document.removeEventListener("visibilitychange", visibility); };
  }, [items, motionAllowed, paused, hovered, focused, visible]);

  if (!items.length) return null;
  const pause = () => setPaused(true);
  return (
    <div className="image-marquee">
      <div
        id={id}
        ref={viewportRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="relative overflow-x-auto pb-2 outline-offset-4"
        onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
        onWheel={pause}
        onTouchStart={pause}
        onPointerDown={pause}
        onKeyDown={pause}
      >
        <div ref={trackRef} className="relative flex w-max items-center gap-4">
          {(motionAllowed ? [...items, ...items] : items).map((item, index) => {
            const duplicate = index >= items.length;
            const image = <Image src={item.src} alt={duplicate ? "" : item.alt || "Gallery photograph"} width={400} height={300} draggable={false} className="h-48 w-64 object-cover sm:h-56 sm:w-72" />;
            return <div key={`${item.src}-${index}`} className="shrink-0 overflow-hidden rounded-[var(--media-radius)] border border-border" aria-hidden={duplicate || undefined} inert={duplicate || undefined} data-marquee-copy={duplicate ? "duplicate" : "original"}>
              {href && !duplicate ? <Link href={href} className="block" aria-label={`Open gallery: ${item.alt || label}`}>{image}</Link> : image}
            </div>;
          })}
        </div>
      </div>
      {motionAllowed ? <div className="mt-2 flex justify-end">
        <button type="button" aria-controls={id} aria-pressed={paused} onClick={() => setPaused(value => !value)} className="inline-flex min-h-9 items-center gap-2 rounded-[var(--media-radius)] px-2 text-xs text-muted-foreground hover:text-accent">
          {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
          {paused ? "Resume slideshow" : "Pause slideshow"}
        </button>
      </div> : null}
    </div>
  );
}
