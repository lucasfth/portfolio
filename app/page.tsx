import Image from "next/image";
import { person } from "@/lib/agent-content";
import Link from "next/link";
import Hero from "@/components/Hero";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";
import Markdown from "@/components/Markdown";
import ExperienceTimeline from "@/components/ExperienceTimeline";
import ProjectCard from "@/components/ProjectCard";
import PostRow from "@/components/PostRow";
import HomeGalleries from "@/components/HomeGalleries";
import {
  getFrontpage,
  parseFrontpage,
  getProjects,
  getBlogPosts,
  getGalleries,
  getGalleryImages,
  type FrontpageSection,
} from "@/lib/content";
import { ArrowUpRight } from "lucide-react";
import { SITE_URL } from "@/lib/content";

export const metadata = {
  alternates: { canonical: SITE_URL },
};

/** Strip the leading `#` heading + the legacy profile-picture image line. */
function introText(markdown: string): string {
  return markdown
    .split("\n")
    .filter(
      (l) =>
        !l.trim().startsWith("#") && !/^!\s*\[profile picture\]/i.test(l.trim())
    )
    .join("\n")
    .trim();
}

function Section({
  section,
  index,
}: {
  section: FrontpageSection;
  index: string;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
      <SectionHeading index={index} title={section.title} />
      {section.entries.length > 0 ? (
        <ExperienceTimeline entries={section.entries} />
      ) : (
        <div className="max-w-3xl">
          <Markdown>{section.content}</Markdown>
        </div>
      )}
    </section>
  );
}

export default async function Home() {
  const front = getFrontpage();
  const { intro, sections } = parseFrontpage(front.body);
  const projects = getProjects();
  const posts = getBlogPosts();
  const galleries = getGalleries();
  const galleryImages = await Promise.all(
    galleries.map((g) => getGalleryImages(g.id))
  );

  const aboutSections = sections.filter((s) =>
    ["IT Work experience", "Volunteering", "Languages", "Education"].includes(
      s.title
    )
  );

  let sectionCounter = 0;
  const nextIndex = () => `0${++sectionCounter}`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }} />
      <Hero name={front.name} tagline={front.tagline} heroImage={front.heroImage} />

      {/* About */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <SectionHeading index={nextIndex()} title="About me" />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,340px)_1fr] md:gap-16">
          {front.profileImage && (
            <Reveal>
              <div className="relative aspect-square w-full max-w-[340px] overflow-hidden rounded-3xl border border-border">
                <Image
                  src={front.profileImage}
                  alt="Portrait of Lucas Hanson"
                  fill
                  sizes="(max-width: 768px) 100vw, 340px"
                  className="object-cover"
                  style={{ filter: "grayscale(100%) contrast(1.05)" }}
                />
                <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
              </div>
            </Reveal>
          )}
          <Reveal delay={80}>
            <div className="text-base leading-relaxed text-foreground/90">
              <Markdown>{introText(intro)}</Markdown>
            </div>
          </Reveal>
        </div>
      </section>

      {aboutSections.map((s) => (
        <Section key={s.title} section={s} index={nextIndex()} />
      ))}

      {/* Projects (auto-discovered) */}
      {projects.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
          <SectionHeading
            index={nextIndex()}
            title="Projects"
            description="A selection of the larger projects I have worked on."
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {projects.map((p, i) => (
              <Reveal key={p.slug} delay={i * 70}>
                <ProjectCard project={{ ...p, body: "" }} />
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10">
            <Link
              href="/projects"
              className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              All projects
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        </section>
      )}

      {/* Blog (auto-discovered) */}
      {posts.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
          <SectionHeading
            index={nextIndex()}
            title="Blog"
            description="Thoughts, experiences and insights."
          />
          <div>
            {posts.map((post, i) => (
              <Reveal key={post.slug} delay={i * 60}>
                <PostRow post={{ ...post, body: "" }} index={i} />
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10">
            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              All posts
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        </section>
      )}

      <HomeGalleries galleries={galleries.map(({id,title},i) => ({id,title,imageCount:galleryImages[i].length}))} galleryImages={galleryImages.map(images => images.slice(0,3).map(({src,alt}) => ({src,alt})))} index={nextIndex()} />
    </>
  );
}
