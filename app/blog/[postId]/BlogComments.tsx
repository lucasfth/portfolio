"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    CUSDIS?: { initial?: () => void };
    __cusdisLoaded?: boolean;
  }
}

const CUSDIS_HOST = "https://cusdis.com";
const CUSDIS_APP_ID = "d29ad22a-c8fb-4d05-98a4-81f79e2d7b15";

/**
 * Cusdis comments.
 *
 * The thread container is rendered server-side with static data-attributes
 * (postId is a build-time known SSG param), and the UMD build of Cusdis is
 * loaded as a classic script. The UMD build is required: the ES module build
 * (`cusdis.es.js`) imports `iframe.umd.js` cross-origin, which fails without
 * CORS headers and silently breaks the comments.
 */
export default function BlogComments({ postId }: { postId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadScript = () => {
      if (window.CUSDIS?.initial || window.__cusdisLoaded) return;
      const existing = document.getElementById("cusdis-script");
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://cusdis.com/js/cusdis.umd.js";
        script.async = true;
        script.id = "cusdis-script";
        document.body.appendChild(script);
      }
      window.__cusdisLoaded = true;
    };

    loadScript();

    // The script loads asynchronously; poll for window.CUSDIS and init.
    let tries = 0;
    const timer = setInterval(() => {
      if (window.CUSDIS?.initial) {
        clearInterval(timer);
        window.CUSDIS.initial();
      } else if (++tries > 30) {
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [postId]);

  // Keep Cusdis's own page-url metadata current on client navigations.
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.setAttribute("data-page-url", window.location.href);
    }
  }, [postId]);

  return (
    <div
      ref={containerRef}
      id="cusdis_thread"
      data-host={CUSDIS_HOST}
      data-app-id={CUSDIS_APP_ID}
      data-page-id={postId}
      // data-page-url is set in the effect below (before CUSDIS.initial) so the
      // server and client HTML match (no hydration mismatch).
    />
  );
}
