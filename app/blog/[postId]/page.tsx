import BlogPostClient from "./BlogPostClient";
import { readFileSync } from "fs";
import { join } from "path";

export function generateStaticParams() {
  return [{ postId: "downsize-images" }, { postId: "first-post" }];
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  try {
    const markdownPath = join(
      process.cwd(),
      "public",
      "content",
      "blog",
      `${postId}.md`
    );
    const markdown = readFileSync(markdownPath, "utf8");

    return <BlogPostClient markdown={markdown} postId={postId} />;
  } catch (err) {
    console.error("Error loading markdown:", err);
    return <BlogPostClient markdown="" postId={postId} />;
  }
}
