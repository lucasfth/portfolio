import { Metadata } from "next";
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import ImageHeader from "../../../components/ImageHeader";
import TextSection from "../../../components/TextSection";
import BlogPostComponent from "../../../components/BlogPost";

interface BlogPostPageProps {
  params: Promise<{ postId: string }>;
}

const postMetadata: Record<string, { title: string; description: string }> = {
  "first-post": {
    title: "My First Blog Post",
    description:
      "Welcome to my first blog post where I share thoughts, experiences, and insights on various topics.",
  },
  "downsize-images": {
    title: "Downsizing Images",
    description:
      "Learn how to downsize images to prevent unauthorized use while maintaining quality for web display.",
  },
};

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { postId } = await params;
  const post = postMetadata[postId];

  if (!post) {
    return {
      title: "Blog Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  return {
    title: `${post.title} - Lucas Hanson Blog`,
    description: post.description,
  };
}

export async function generateStaticParams() {
  return [{ postId: "first-post" }, { postId: "downsize-images" }];
}

async function getMarkdownContent(postId: string) {
  const filePath = path.join(
    process.cwd(),
    "public",
    "content",
    "blog",
    `${postId}.md`
  );

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return fileContent;
  } catch (error) {
    return null;
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { postId } = await params;
  const markdown = await getMarkdownContent(postId);

  if (!markdown) {
    notFound();
  }

  return <BlogPostComponent postId={postId} markdown={markdown} />;
}
