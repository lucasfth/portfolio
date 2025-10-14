import ImageHeader from "@/components/ImageHeader";
import TextSection from "@/components/TextSection";
import { readFileSync } from "fs";
import { join } from "path";

export default function Home() {
  const markdownPath = join(process.cwd(), "public", "content", "frontpage.md");
  const markdown = readFileSync(markdownPath, "utf8");

  return (
    <>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />
    </>
  );
}
