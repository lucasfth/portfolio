"use client";

import React from "react";
import Link from "next/link";
import ThemeImage from "@/components/ThemeImage";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/content";

/**
 * Spotlight card for a project. The radial highlight follows the pointer
 * (Apple-spotlight style, adapted from the ObsidianUI aesthetic).
 */
export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${encodeURIComponent(project.slug)}`}
      className="group relative block overflow-hidden rounded-[var(--media-radius)] border border-border bg-card transition-colors duration-300 hover:border-border-strong"
    >
      {/* Cover image */}
      {(project.image || project.imageLight || project.imageDark) && (
        <div data-terminal-media className="relative aspect-[16/10] w-full overflow-hidden">
          <ThemeImage
            image={project.image} imageLight={project.imageLight} imageDark={project.imageDark}
            alt={project.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}

      {/* Spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px circle at var(--x, 50%) var(--y, 50%), var(--glow-strong), transparent 45%)",
        }}
        aria-hidden="true"
        onMouseMove={(e) => {
          const el = e.currentTarget.parentElement;
          if (!el) return;
          const r = el.getBoundingClientRect();
          el.style.setProperty("--x", `${e.clientX - r.left}px`);
          el.style.setProperty("--y", `${e.clientY - r.top}px`);
        }}
      />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-3xl tracking-tight">{project.title}</h3>
            {project.tagline && (
              <p className="mt-1 text-sm text-muted-foreground">{project.tagline}</p>
            )}
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-300 group-hover:border-border-strong group-hover:text-foreground">
            <ArrowUpRight size={16} />
          </span>
        </div>

        {project.tags && project.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
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
    </Link>
  );
}
