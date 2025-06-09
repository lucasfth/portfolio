"use client";

import React, { useEffect, useState } from "react";
import TextSection from "./TextSection";
import ImageHeader from "./ImageHeader";
import "./BlogPost.css";

interface BlogPostProps {
  postId: string;
  markdown: string;
}

function BlogPost({ postId, markdown }: BlogPostProps) {
  const [isClient, setIsClient] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");

  // Ensure we're on the client side to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true);
    setPageUrl(window.location.href);
    setPageTitle(document.title);
  }, []);

  useEffect(() => {
    if (!isClient) return;

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
  }, [postId, isClient]);

  useEffect(() => {
    if (!isClient) return;

    const setIframeHeight = () => {
      const iframe = document.querySelector(
        "#cusdis_thread iframe"
      ) as HTMLIFrameElement;
      if (!iframe) return;

      const postsWithComments = ["downsize-images"]; // Fixed the postId name

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
      }
    }, 1000);

    return () => {
      clearInterval(checkIframe);
    };
  }, [postId, isClient]);

  return (
    <>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />

      {/* Comments Section - Only render when client-side */}
      {isClient && (
        <section className="blog-comments-section">
          <div className="container">
            <h2>Comments</h2>
            <div
              id="cusdis_thread"
              className="comments-container"
              data-host="https://cusdis.com"
              data-app-id="d29ad22a-c8fb-4d05-98a4-81f79e2d7b15"
              data-page-id={postId}
              data-page-url={pageUrl}
              data-page-title={pageTitle}
            ></div>
          </div>
        </section>
      )}
    </>
  );
}

export default BlogPost;
