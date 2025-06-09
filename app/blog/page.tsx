import { Metadata } from "next";
import fs from "fs";
import path from "path";
import ImageHeader from "../../components/ImageHeader";
import TextSection from "../../components/TextSection";
import Blog from "../../components/Blog";

export const metadata: Metadata = {
  title: "Blog - Lucas Hanson",
  description:
    "Read my thoughts, experiences, and insights on software development, photography, and technology.",
};

async function getMarkdownContent() {
  const filePath = path.join(process.cwd(), "public", "content", "blog.md");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return fileContent;
}

export default async function BlogPage() {
  const markdown = await getMarkdownContent();

  return <Blog markdown={markdown} />;
}
