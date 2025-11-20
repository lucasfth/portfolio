"use client";

// (no hooks used in this client component now; keep as a client component so it can access window/document)
import BlogComments from "./BlogComments";
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
  // Comments are rendered via the client-only `BlogComments` component below.

  return (
    <>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />

      {/* Comments Section */}
      <section className="blog-comments-section">
        <div className="container">
          <h2>Comments</h2>
          <BlogComments postId={postId} />
        </div>
      </section>
    </>
  );
}
