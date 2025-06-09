import { Metadata } from "next";
import fs from "fs";
import path from "path";
import ImageHeader from "../../components/ImageHeader";
import GalleryContent from "../../components/GalleryContent";
import Aperture from "../../components/Aperture";

export const metadata: Metadata = {
  title: "Aperture - Photography Gallery - Lucas Hanson",
  description:
    "Explore my photography portfolio featuring moody, minimalistic captures including nature, urban, snow, and university scenes.",
};

async function getMarkdownContent() {
  const filePath = path.join(process.cwd(), "public", "content", "aperture.md");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return fileContent;
}

export default async function AperturePage() {
  const markdown = await getMarkdownContent();

  return <Aperture markdown={markdown} />;
}
