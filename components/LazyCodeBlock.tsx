"use client";

import dynamic from "next/dynamic";

// Prism + themes are ~200 KB gzipped. Split them out so routes that import
// Markdown but render no code (e.g. the homepage) never download them.
const LazyCodeBlock = dynamic(() => import("./CodeBlock"), {
  loading: () => <div className="code-block-wrapper" />,
});

export default LazyCodeBlock;
