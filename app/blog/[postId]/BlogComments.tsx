"use client";

import { useEffect, useRef } from "react";

const GISCUS_SCRIPT_ID = "giscus-script";
const GISCUS_ORIGIN = "https://giscus.app";
const GISCUS_REPO = "lucasfth/portfolio";
const GISCUS_REPO_ID = "R_kgDON6IhoQ";
const GISCUS_CATEGORY = "General";
const GISCUS_CATEGORY_ID = "DIC_kwDON6Ihoc4CnW__";

export default function BlogComments({ postId }: { postId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Giscus reads the current URL when its script executes. Recreate the
    // script for each post so client-side navigation gets a fresh discussion.
    document.getElementById(GISCUS_SCRIPT_ID)?.remove();
    container.replaceChildren();

    const discussionTerm = `Comments: /blog/${postId}`;
    const script = document.createElement("script");
    script.id = GISCUS_SCRIPT_ID;
    script.src = `${GISCUS_ORIGIN}/client.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", GISCUS_REPO);
    script.setAttribute("data-repo-id", GISCUS_REPO_ID);
    script.setAttribute("data-category", GISCUS_CATEGORY);
    script.setAttribute("data-category-id", GISCUS_CATEGORY_ID);
    script.setAttribute("data-mapping", "specific");
    script.setAttribute("data-term", discussionTerm);
    script.setAttribute("data-strict", "1");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", "preferred_color_scheme");
    script.setAttribute("data-lang", "en");

    document.body.appendChild(script);

    return () => {
      script.remove();
      container.replaceChildren();
    };
  }, [postId]);

  return <div ref={containerRef} className="giscus" />;
}
