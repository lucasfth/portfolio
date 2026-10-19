"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

type Preview = { slug: string; title: string; tagline?: string; image?: string; tags?: string[] };

export default function ProjectShowcase({ projects }: { projects: Preview[] }) {
  const [selected, setSelected] = useState(0);
  const reduce = useReducedMotion();
  const active = projects[selected];
  if (!active) return null;
  return (
    <div className="work-showcase">
      <div className="work-index">
        {projects.map((project, i) => (
          <article key={project.slug} className="work-entry" data-selected={selected === i}>
            <div className="work-entry-heading">
              <h3 className="work-title"><span className="work-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><Link href={`/projects/${encodeURIComponent(project.slug)}`}>{project.title}</Link></h3>
              <button type="button" onClick={() => setSelected(i)} aria-pressed={selected === i} aria-label={`Preview ${project.title}`} className="work-preview-button">Preview</button>
              <Link href={`/projects/${encodeURIComponent(project.slug)}`} aria-label={`Read ${project.title}`} className="work-open"><ArrowUpRight size={20} /></Link>
            </div>
            <p>{project.tagline}</p>
            <div className="work-tags">{project.tags?.slice(0, 3).join(" / ")}</div>
            {project.image && <Link href={`/projects/${encodeURIComponent(project.slug)}`} className="work-mobile-image" tabIndex={-1} aria-hidden="true"><Image src={project.image} alt="" width={720} height={450} sizes="100vw" /></Link>}
          </article>
        ))}
      </div>
      <div className="work-stage" aria-label="Selected project preview">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={active.slug} initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -6 }} transition={{ duration: reduce ? 0 : 0.2 }} className="work-stage-inner">
            <Link href={`/projects/${encodeURIComponent(active.slug)}`} className="work-stage-link">
              <div className="work-stage-image">{active.image && <Image src={active.image} alt={`Preview of ${active.title}`} fill sizes="(min-width: 768px) 50vw, 1px" className="object-cover" />}</div>
              <div className="work-caption"><span>{active.title}</span><span>Explore project <ArrowUpRight size={16} /></span></div>
            </Link>
          </motion.div>
        </AnimatePresence>
        <span className="work-stage-note">Selected work / software & research</span>
      </div>
    </div>
  );
}
