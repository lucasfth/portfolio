"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createAsciiReveal, presets } from "ascii-reveal/core";
import { usePathname } from "next/navigation";

/** Enhance real server-rendered content; never hide it while loading the effect. */
function useTerminalReveal(scope: React.RefObject<HTMLElement | null>, titlesOnly = false, enabled = true) {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const controllers: { destroy(): void }[] = [];
    let observer: IntersectionObserver | undefined;
    async function start() {
      try {
        // Headings use system fonts: start synchronously before the hydration
        // paint instead of waiting for the unrelated body font and a lazy chunk.
        const root = titlesOnly ? document.getElementById("main-content") : scope.current;
        if (cancelled || !root) return;
        // Image previews must be decoded before the grid samples their pixels.
        if (!titlesOnly) await Promise.all(Array.from(root.querySelectorAll("img")).map(image => image.decode().catch(() => {})));
        if (cancelled) return;
        const targets = titlesOnly ? Array.from(root.querySelectorAll<HTMLElement>("h1, [data-terminal-heading], [data-terminal-media]")) : [root];
        async function reveal(target: HTMLElement) {
          const images = Array.from(target.querySelectorAll("img"));
          if (images.length) await Promise.all(images.map(image => image.decode().catch(() => {})));
          if (cancelled || !target.isConnected) return;
          try {
            const controller = createAsciiReveal(target, { preset: { ...presets.terminal, tick: 120, ...(images.length ? { color: "source" as const } : {}) }, origin: "top-left", speed: 2, duration: "cinematic" });
            controllers.push(controller);
            await controller.reveal().catch(() => controller.destroy());
          } catch {
            // Keep optional media enhancement from interrupting the page.
          }
        }
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) {
            observer?.unobserve(entry.target);
            void reveal(entry.target as HTMLElement);
          }
        }, { threshold: 0.15 });
        for (const target of targets) {
          const rect = target.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) void reveal(target);
          else observer.observe(target);
        }
      } catch {
        // An optional animation must never prevent reading the page.
        controllers.forEach(controller => controller.destroy());
      }
    }
    void start();
    return () => { cancelled = true; observer?.disconnect(); controllers.forEach(controller => controller.destroy()); };
  }, [pathname, scope, titlesOnly, enabled]);
}

export function TitleReveals() {
  const scope = useRef<HTMLElement | null>(null);
  useTerminalReveal(scope, true);
  return null;
}

export default function TerminalReveal({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const scope = useRef<HTMLDivElement>(null);
  useTerminalReveal(scope, false, enabled);
  return <div ref={scope} className="terminal-reveal">{children}</div>;
}
