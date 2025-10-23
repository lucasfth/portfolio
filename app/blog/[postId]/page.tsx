import BlogPostClient from "./BlogPostClient";
import { readFileSync } from "fs";
import { join } from "path";

export async function generateMetadata({ params }: any) {
  try {
    const markdownPath = join(
      process.cwd(),
      "public",
      "content",
      "blog",
      `${params.postId}.md`
    );
    const content = readFileSync(markdownPath, "utf8");
    // simple extraction: first heading and first non-empty paragraph
    const lines = content.split("\n");
    const titleLine = lines.find((l) => l.startsWith("#")) || "Blog post";
    const title = titleLine.replace(/^#+\s*/, "");
    const firstPara =
      lines.find(
        (l) => l.trim() && !l.startsWith("#") && !l.startsWith("![")
      ) || "";
    const description = firstPara.trim().slice(0, 160);

    const siteUrl = process.env.SITE_URL || "https://lucashanson.dk";
    const ogImageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(
      title
    )}&subtitle=${encodeURIComponent("Lucas Hanson Blog")}`;

    return {
      title,
      description,
      alternates: { canonical: `${siteUrl}/blog/${params.postId}` },
      openGraph: {
        title,
        description,
        url: `https://lucashanson.dk/blog/${params.postId}`,
        images: [ogImageUrl],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (e) {
    return {};
  }
}

export function generateStaticParams() {
  return [{ postId: "downsize-images" }, { postId: "first-post" }];
}

export default function BlogPost({ params }: any) {
  const { postId } = params as { postId: string };
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
