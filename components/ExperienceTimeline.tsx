"use client";

import React from "react";
import Link from "next/link";
import type { ExperienceEntry } from "@/lib/content";
import Reveal from "./Reveal";
import Markdown from "./Markdown";

interface ExperienceTimelineProps {
  entries: ExperienceEntry[];
}

/**
 * Vertical timeline for role/volunteering entries parsed from the frontpage
 * (title + org + dates + description).
 */
export default function ExperienceTimeline({ entries }: ExperienceTimelineProps) {
  return (
    <ol className="relative ml-3 border-l border-border">
      {entries.map((entry, i) => (
        <Reveal as="li" key={i} delay={i * 60} className="relative pb-10 pl-8 last:pb-0">
          {/* Node */}
          <span
            className="absolute -left-[5px] top-2 size-2.5 rounded-full bg-foreground ring-4 ring-background"
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-hand text-2xl tracking-tight">{entry.title}</h3>
            {entry.dates && (
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {entry.dates}
              </span>
            )}
          </div>
          {entry.org && (
            <p className="mt-1 text-sm font-medium text-foreground/90">
              {entry.orgUrl ? (
                <a
                  href={entry.orgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  {entry.org}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                entry.org
              )}
            </p>
          )}
          {entry.description && (
            <div className="entry-description mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              <Markdown>{entry.description}</Markdown>
            </div>
          )}
        </Reveal>
      ))}
    </ol>
  );
}
