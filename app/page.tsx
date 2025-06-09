import { Metadata } from "next";
import fs from "fs";
import path from "path";
import ImageHeader from "../components/ImageHeader";
import TextSection from "../components/TextSection";

export const metadata: Metadata = {
  title: "Lucas Hanson - About Me",
  description:
    "Aspiring software developer focused on backend development and system architecture. BSc in Software Development from IT University of Copenhagen.",
};

async function getMarkdownContent() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "content",
    "frontpage.md"
  );
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return fileContent;
}

export default async function HomePage() {
  const markdown = await getMarkdownContent();

  return (
    <>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />
    </>
  );
}
