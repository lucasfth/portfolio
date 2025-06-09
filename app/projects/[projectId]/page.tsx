import { Metadata } from "next";
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import ImageHeader from "../../../components/ImageHeader";
import TextSection from "../../../components/TextSection";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

const projectMetadata: Record<string, { title: string; description: string }> =
  {
    bachelor: {
      title: "Bachelor Project - Hand Gesture Interaction",
      description:
        "Research project on hand-gesture-based interaction in hybrid meetings using Python, TensorFlow, and Google Mediapipe.",
    },
    repolicense: {
      title: "Repolicense - License Selection Tool",
      description:
        "Web application to help developers choose the right license for open-source projects using JavaScript and decision trees.",
    },
    dhi: {
      title: "DHI GreenUP Project",
      description:
        "Urban planning application developed with Python, TypeScript, React, and FastAPI for sustainable city development.",
    },
  };

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = projectMetadata[projectId];

  if (!project) {
    return {
      title: "Project Not Found",
      description: "The requested project could not be found.",
    };
  }

  return {
    title: `${project.title} - Lucas Hanson`,
    description: project.description,
  };
}

export async function generateStaticParams() {
  return [
    { projectId: "bachelor" },
    { projectId: "repolicense" },
    { projectId: "dhi" },
  ];
}

async function getMarkdownContent(projectId: string) {
  const filePath = path.join(
    process.cwd(),
    "public",
    "content",
    "projects",
    `${projectId}.md`
  );

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return fileContent;
  } catch (error) {
    return null;
  }
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const markdown = await getMarkdownContent(projectId);

  if (!markdown) {
    notFound();
  }

  return (
    <>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />
    </>
  );
}
