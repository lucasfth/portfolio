"use client";

import BlogComments from "./BlogComments";
import PageShell from "@/components/PageShell";
import "./BlogPost.css";

interface BlogPostClientProps {
  markdown: string;
  postId: string;
}

export default function BlogPostClient({ markdown, postId }: BlogPostClientProps) {
  return (
    <>
      <PageShell markdown={markdown} />
      <section className="blog-comments-section">
        <div className="container">
          <h2>Comments</h2>
          <BlogComments postId={postId} />
        </div>
      </section>
    </>
  );
}
