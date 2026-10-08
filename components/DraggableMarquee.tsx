"use client";

import {
  useEffect,
  useState,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import gsap from "gsap";
import Draggable from "gsap/Draggable";
import "@/lib/effects/draggable-marquee/styles.css";

if (typeof window !== "undefined") gsap.registerPlugin(Draggable);

export interface MarqueeItem {
  id?: string | number;
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  imageClassName?: string;
}

interface DraggableMarqueeProps {
  items: MarqueeItem[];
  deferredItemsUrl?: string;
  speed?: number;
  repeatCount?: number;
  gapClassName?: string;
  className?: string;
  trackClassName?: string;
  itemClassName?: string;
  pauseOnHover?: boolean;
  renderItem?: (item: MarqueeItem, index: number) => ReactNode;
  throwMultiplier?: number;
  throwFriction?: number;
  maxThrowVelocity?: number;
  initialOffset?: number;
  loopStart?: number;
  loopEndMultiplier?: number;
  label?: string;
}

/**
 * Draggable, auto-scrolling image marquee (ported from ObsidianUI, MIT).
 * Inert under prefers-reduced-motion (plain horizontal scroll instead).
 */
export default function DraggableMarquee({
  items: initialItems = [],
  deferredItemsUrl,
  speed = 1,
  repeatCount = 3,
  gapClassName = "gap-6",
  className = "",
  trackClassName = "",
  itemClassName = "rounded-2xl",
  pauseOnHover = false,
  renderItem,
  throwMultiplier = 2.8,
  throwFriction = 0.975,
  maxThrowVelocity = 60,
  initialOffset = 0,
  loopStart = 0,
  loopEndMultiplier = -1.02,
  label = "Image marquee. Drag or use the left and right arrow keys.",
}: DraggableMarqueeProps) {
  const [items, setItems] = useState(initialItems);
  useEffect(() => {
    if (!deferredItemsUrl) return;
    let active = true;
    fetch(deferredItemsUrl).then(r => { if (!r.ok) throw new Error("Gallery unavailable"); return r.json(); }).then(data => { if (active) setItems(data); }).catch(() => {});
    return () => { active = false; };
  }, [deferredItemsUrl]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  // The Draggable instance type is not exposed on the gsap namespace in the
  // installed @types/gsap version, so keep it structural/any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dragRef = useRef<any>(null);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const duplicatedItems = useMemo(
    () => Array.from({ length: hydrated ? repeatCount : 1 }).flatMap(() => items),
    [items, repeatCount, hydrated]
  );

  useEffect(() => {
    if (!hydrated || !rootRef.current || !trackRef.current || !items.length) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const root = rootRef.current as HTMLDivElement;
      const track = trackRef.current as HTMLDivElement;

      let singleSetWidth = 0;
      let x = initialOffset;
      let throwVelocity = 0;
      let isPointerOver = false;
      let isDragging = false;
      let lastDragX = 0;
      let lastDragTime = 0;

      let wrapValue = (value: number) => value;
      let resizeRaf: number | null = null;

      const observers: ResizeObserver[] = [];
      const setX = gsap.quickSetter(track, "x", "px");

      const getGap = () => {
        const styles = window.getComputedStyle(track);
        return parseFloat(styles.columnGap || styles.gap || "0");
      };

      const buildWrap = () => {
        const min = singleSetWidth * loopEndMultiplier;
        const max = loopStart;
        wrapValue = gsap.utils.wrap(min, max);
      };

      const getProgressInLoop = () => {
        if (!singleSetWidth) return 0;
        const min = singleSetWidth * loopEndMultiplier;
        const max = loopStart;
        const range = max - min;
        if (!range) return 0;
        let wrapped = x;
        while (wrapped < min) wrapped += range;
        while (wrapped > max) wrapped -= range;
        return (wrapped - min) / range;
      };

      const setProgressInLoop = (progress: number) => {
        if (!singleSetWidth) return;
        const min = singleSetWidth * loopEndMultiplier;
        const max = loopStart;
        const range = max - min;
        x = min + range * progress;
        x = wrapValue(x);
        setX(x);
        if (dragRef.current) dragRef.current.x = x;
      };

      const measure = () => {
        const children = Array.from(track.children);
        const setSize = Math.floor(children.length / repeatCount);
        const firstSetChildren = children.slice(0, setSize);
        const gap = getGap();
        if (!firstSetChildren.length) return;
        const prevProgress = getProgressInLoop();
        const widths = firstSetChildren.reduce(
          (sum, child) => sum + child.getBoundingClientRect().width,
          0
        );
        singleSetWidth =
          widths + gap * Math.max(0, firstSetChildren.length - 1);
        buildWrap();
        if (!Number.isFinite(prevProgress)) {
          x = wrapValue(initialOffset);
          setX(x);
        } else {
          setProgressInLoop(prevProgress);
        }
      };

      const scheduleMeasure = () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => measure());
      };

      const update = () => {
        if (!isDragging) {
          if (!(pauseOnHover && isPointerOver)) x -= speed;
          x += throwVelocity;
          throwVelocity *= throwFriction;
          if (Math.abs(throwVelocity) < 0.01) throwVelocity = 0;
        }
        x = wrapValue(x);
        setX(x);
      };

      measure();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dragRef.current = (
        Draggable.create(track, {
          type: "x",
          allowContextMenu: true,
          dragClickables: true,
          onPress() {
            isDragging = true;
            throwVelocity = 0;
            this.x = x;
            lastDragX = this.x;
            lastDragTime = performance.now();
          },
          onDrag() {
            const now = performance.now();
            const dx = this.x - lastDragX;
            const dt = now - lastDragTime;
            x = wrapValue(this.x);
            setX(x);
            this.x = x;
            if (dt > 0) {
              const sampledVelocity = (dx / dt) * 36.67;
              throwVelocity = gsap.utils.clamp(
                -maxThrowVelocity,
                maxThrowVelocity,
                sampledVelocity * throwMultiplier
              );
            }
            lastDragX = this.x;
            lastDragTime = now;
          },
          onRelease() {
            isDragging = false;
          },
        })
      )[0];

      const handleMouseEnter = () => {
        isPointerOver = true;
      };
      const handleMouseLeave = () => {
        isPointerOver = false;
      };
      if (pauseOnHover) {
        root.addEventListener("mouseenter", handleMouseEnter);
        root.addEventListener("mouseleave", handleMouseLeave);
      }

      const handleResize = () => scheduleMeasure();
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        x = wrapValue(x + (event.key === "ArrowLeft" ? 1 : -1) * root.clientWidth * 0.35);
        throwVelocity = 0;
        setX(x);
      };
      root.addEventListener("keydown", handleKeyDown);
      window.addEventListener("resize", handleResize);

      const children = Array.from(track.children);
      const setSize = Math.floor(children.length / repeatCount);
      const firstSetChildren = children.slice(0, setSize);

      const trackObserver = new ResizeObserver(() => scheduleMeasure());
      trackObserver.observe(track);
      observers.push(trackObserver);

      firstSetChildren.forEach((child) => {
        const ro = new ResizeObserver(() => scheduleMeasure());
        ro.observe(child);
        observers.push(ro);
        child.querySelectorAll("img").forEach((img) => {
          if (!img.complete) img.addEventListener("load", scheduleMeasure, { once: false });
        });
      });

      gsap.ticker.add(update);

      return () => {
        root.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("resize", handleResize);
        if (pauseOnHover) {
          root.removeEventListener("mouseenter", handleMouseEnter);
          root.removeEventListener("mouseleave", handleMouseLeave);
        }
        gsap.ticker.remove(update);
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        observers.forEach((observer) => observer.disconnect());
        Array.from(track.children).forEach((child) => {
          child.querySelectorAll("img").forEach((img) => {
            img.removeEventListener("load", scheduleMeasure);
          });
        });
        if (dragRef.current) {
          dragRef.current.kill();
          dragRef.current = null;
        }
      };
    }, rootRef);

    return () => media.revert();
  }, [
    hydrated,
    items,
    speed,
    repeatCount,
    pauseOnHover,
    throwMultiplier,
    throwFriction,
    maxThrowVelocity,
    initialOffset,
    loopStart,
    loopEndMultiplier,
  ]);

  if (!items.length) return null;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-label={label}
      className={`obsidian-draggable-marquee relative w-full cursor-grab overflow-hidden outline-offset-4 focus-visible:outline-2 active:cursor-grabbing ${className}`}
    >
      <div
        ref={trackRef}
        className={`flex w-max items-center ${gapClassName} ${trackClassName}`}
      >
        {duplicatedItems.map((item, index) => (
          <div
            key={`${item?.id ?? item?.src ?? "item"}-${index}`}
            className={`shrink-0 ${itemClassName}`}
            aria-hidden={index >= items.length}
            data-marquee-copy={index >= items.length ? "duplicate" : "original"}
          >
            {renderItem ? (
              renderItem(item, index % items.length)
            ) : (
              <Image
                src={item.src}
                alt={item.alt || "marquee item"}
                width={item.width || 400}
                height={item.height || 500}
                className={
                  item.imageClassName ||
                  "max-sm:h-[420px] max-sm:w-[320px] h-auto w-auto object-cover"
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
