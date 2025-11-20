"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    cusdisScriptLoaded?: boolean;
    CUSDIS?: any;
  }
}

interface BlogCommentsProps {
  postId: string;
}

export default function BlogComments({ postId }: BlogCommentsProps) {
  useEffect(() => {
    // Load the cusdis script client-side only
    if (!window.cusdisScriptLoaded) {
      const existingScript =
        document.getElementById("cusdis-script") ||
        document.querySelector(
          'script[src="https://cusdis.com/js/cusdis.es.js"]'
        );

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://cusdis.com/js/cusdis.es.js";
        script.async = true;
        script.defer = true;
        script.id = "cusdis-script";

        window.cusdisScriptLoaded = true;
        document.body.appendChild(script);
      }
    }

    const initTimer = setTimeout(() => {
      if (window.CUSDIS) {
        window.CUSDIS.initial();
      }
    }, 1000);

    return () => {
      clearTimeout(initTimer);
    };
  }, [postId]);

  // Only render the comments container after the client has mounted
  const [isMounted, setIsMounted] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setPageUrl(window.location.href);
    setPageTitle(document.title);
  }, []);

  useEffect(() => {
    const setIframeHeight = () => {
      const iframe = document.querySelector(
        "#cusdis_thread iframe"
      ) as HTMLIFrameElement;
      if (!iframe) return;

      const postsWithComments = ["downsize-images"];

      if (postsWithComments.includes(postId)) {
        iframe.style.height = "1200px";
      } else {
        iframe.style.height = "350px";
      }
    };

    const checkIframe = setInterval(() => {
      const iframe = document.querySelector("#cusdis_thread iframe");
      if (iframe) {
        clearInterval(checkIframe);

        setIframeHeight();

        return () => {};
      }
    }, 1000);

    return () => {
      clearInterval(checkIframe);
    };
  }, [postId]);

  // Render the comments placeholder — this is client-only to avoid SSR/client mismatches
  if (!isMounted) return null;

  return (
    <div
      id="cusdis_thread"
      className="comments-container"
      data-host="https://cusdis.com"
      data-app-id="d29ad22a-c8fb-4d05-98a4-81f79e2d7b15"
      data-page-id={postId}
      data-page-url={pageUrl}
      data-page-title={pageTitle}
    />
  );
}
