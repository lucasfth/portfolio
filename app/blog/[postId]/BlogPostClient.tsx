"use client";

import { useEffect } from "react";
import TextSection from "@/components/TextSection";
import ImageHeader from "@/components/ImageHeader";
import "./BlogPost.css";

declare global {
  interface Window {
    cusdisScriptLoaded?: boolean;
    CUSDIS?: any;
  }
}

interface BlogPostClientProps {
  markdown: string;
  postId: string;
}

export default function BlogPostClient({
  markdown,
  postId,
}: BlogPostClientProps) {
  useEffect(() => {
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

  useEffect(() => {
    const setIframeHeight = () => {
      const iframe = document.querySelector(
        "#cusdis_thread iframe"
      ) as HTMLIFrameElement;
      if (!iframe) return;

      const postsWithComments = ["downsizing-images"];

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

  return (
    <>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />

      {/* Comments Section */}
      <section className="blog-comments-section">
        <div className="container">
          <h2>Comments</h2>
          <div
            id="cusdis_thread"
            className="comments-container"
            data-host="https://cusdis.com"
            data-app-id="d29ad22a-c8fb-4d05-98a4-81f79e2d7b15"
            data-page-id={postId}
            data-page-url={
              typeof window !== "undefined" ? window.location.href : ""
            }
            data-page-title={
              typeof document !== "undefined" ? document.title : ""
            }
          ></div>
        </div>
      </section>
    </>
  );
}
