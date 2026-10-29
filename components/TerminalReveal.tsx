"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createAsciiReveal, presets } from "ascii-reveal/core";
import { usePathname } from "next/navigation";

/** Enhance real server-rendered content; never hide it while loading the effect. */
function useTerminalReveal(scope: React.RefObject<HTMLElement | null>, titlesOnly = false, enabled = true, loading = false, loadingLoop = false, revision = "") {
  const pathname = usePathname();
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useLayoutEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReducedMotion(query.matches);
    changed(); query.addEventListener?.("change", changed);
    return () => query.removeEventListener?.("change", changed);
  }, []);
  useLayoutEffect(() => {
    if ((!enabled && !loading) || reducedMotion) return;
    let cancelled = false;
    const controllers: { destroy(): void; shimmer(on: boolean): void; reveal(): Promise<void> }[] = [];
    let observer: IntersectionObserver | undefined;
    async function start() {
      try {
        const root = titlesOnly ? document.getElementById("main-content") : scope.current;
        if (cancelled || !root) return;
        if (!titlesOnly && loading && loadingLoop) {
          // The enhancement is optional; absent canvas must leave named source text readable.
          if (!document.createElement("canvas").getContext("2d")) return;
          const controller = createAsciiReveal(root, { preset: { ...presets.terminal, tick: 120 }, origin: "top-left", speed: 2, duration: "cinematic" });
          controllers.push(controller);
          controller.shimmer(true);
          return;
        }
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
        controllers.forEach(controller => controller.destroy());
      }
    }
    void start();
    return () => { cancelled = true; observer?.disconnect(); controllers.forEach(controller => controller.destroy()); };
  }, [pathname, scope, titlesOnly, enabled, loading, loadingLoop, revision, reducedMotion]);
}

export function TitleReveals() {
  const scope = useRef<HTMLElement | null>(null);
  useTerminalReveal(scope, true);
  return null;
}

export default function TerminalReveal({ children, enabled = true, loading = false, loadingLoop = false, revision = "" }: { children: ReactNode; enabled?: boolean; loading?: boolean; loadingLoop?: boolean; revision?: string }) {
  const scope = useRef<HTMLDivElement>(null);
  useTerminalReveal(scope, false, enabled, loading, loadingLoop, revision);
  return <div ref={scope} className="terminal-reveal">{children}</div>;
}
