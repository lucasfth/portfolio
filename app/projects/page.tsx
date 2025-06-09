import { Metadata } from "next";
import fs from "fs";
import path from "path";
import ImageHeader from "../../components/ImageHeader";
import TextSection from "../../components/TextSection";
import Projects from "../../components/Projects";

export const metadata: Metadata = {
  title: "Projects - Lucas Hanson",
  description:
    "Explore my software development projects including bachelor thesis on hand gestures, Repolicense, and GreenUP project with DHI.",
};

async function getMarkdownContent() {
  const filePath = path.join(process.cwd(), "public", "content", "projects.md");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return fileContent;
}

export default async function ProjectsPage() {
  const markdown = await getMarkdownContent();

  return <Projects markdown={markdown} />;
}
