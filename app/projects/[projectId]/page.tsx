import Image from "next/image";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import Reveal from "@/components/Reveal";
import { getProjects, getProject, SITE_URL } from "@/lib/content";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return getProjects().map((project) => ({ projectId: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = getProject(projectId);
  if (!project) return { title: "Project not found" };
  return {
    title: project.title,
    description: project.description,
    alternates: { canonical: `${SITE_URL}/projects/${projectId}` },
    openGraph: {
      title: project.title,
      description: project.description,
      url: `${SITE_URL}/projects/${projectId}`,
    },
  };
}

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = getProject(projectId);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-40 text-center">
        <h1 className="font-hand text-4xl">Project not found</h1>
        <Link href="/projects" className="mt-6 inline-block text-muted-foreground hover:text-foreground">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="relative px-6 pt-32 pb-10 sm:pt-40">
        <div className="mx-auto w-full max-w-4xl">
          <Link
            href="/projects"
            className="group mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            Projects
          </Link>
          <h1 className="font-hand text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            {project.title}
          </h1>
          {project.tagline && (
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              {project.tagline}
            </p>
          )}
          {project.tags && project.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {project.image && (
          <div className="mx-auto mt-10 w-full max-w-4xl px-0 sm:px-6">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-border">
              <Image
                src={project.image}
                alt={project.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 896px"
                className="object-cover"
                style={project.slug === "msc-thesis" ? undefined : { filter: "grayscale(30%) brightness(0.85)" }}
              />
            </div>
          </div>
        )}
      </header>

      <article className="mx-auto w-full max-w-3xl px-6 pb-24">
        <Markdown>{project.body}</Markdown>
      </article>
    </>
  );
}
