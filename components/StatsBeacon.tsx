"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// One row per distinct page per half hour, per browser. Idling on a page does
// not inflate the count; coming back later counts as a revisit.
const THROTTLE_MS = 30 * 60_000;
const CHECK_MS = 30_000;
const STORAGE_KEY = "lucashanson-stats";
const MAX_PATHS = 64;

export default function StatsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const send = () => {
      try {
        const now = Date.now();
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, number>;
        if (now - (stored[pathname] ?? 0) < THROTTLE_MS) return;
        stored[pathname] = now;
        const remembered = Object.keys(stored)
          .sort((a, b) => (stored[b] ?? 0) - (stored[a] ?? 0))
          .slice(0, MAX_PATHS);
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(Object.fromEntries(remembered.map((key) => [key, stored[key]])))
        );

        let region: string | null = null;
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timeZone) {
          const short = timeZone.includes("/") ? timeZone.split("/").pop() : timeZone;
          if (short && /^[A-Za-z][A-Za-z'-]{1,39}$/.test(short)) region = short;
        }

        window.fetch("/api/stats/visit", {
          method: "POST",
          keepalive: true,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: pathname, region: region ?? null }),
        }).catch(() => {
          // The beacon must never mark the page broken.
        });
      } catch {
        // Storage or fetch can fail (private mode, storage full); drop silently.
      }
    };

    send();
    const interval = window.setInterval(send, CHECK_MS);
    return () => window.clearInterval(interval);
  }, [pathname]);

  return null;
}