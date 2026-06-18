import { readMarkdown } from "@/hooks/readMarkdown";
import PageShell from "@/components/PageShell";

export default function Home() {
  const markdown = readMarkdown("content/frontpage.md");
  return <PageShell markdown={markdown} />;
}
