import PageHero from "@/components/PageHero";
import ProjectCard from "@/components/ProjectCard";
import Reveal from "@/components/Reveal";
import { getProjects } from "@/lib/content";

export const metadata = {
  title: "Projects",
  description:
    "A selection of the larger software projects I have worked on.",
};

export default function Projects() {
  const projects = getProjects();

  return (
    <>
      <PageHero
        eyebrow="Work"
        title="Projects"
        description="A selection of the larger projects I have worked on. Questions? Reach out via one of the socials in the footer."
      />
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={i * 70}>
              <ProjectCard project={p} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
