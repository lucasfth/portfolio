"use client";

import React from "react";
import {
  Aperture,
  Briefcase,
  GraduationCap,
  HandHeart,
  Languages,
  PenLine,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Reveal from "./Reveal";

/**
 * Monochrome icon per section title (replaces the old emoji headings).
 * Resolved here, inside the client component, because icon components
 * (functions) cannot be passed as props from a server component across the
 * RSC boundary — only the serializable title string can.
 */
const ICONS: Record<string, LucideIcon> = {
  "About me": UserRound,
  "IT Work experience": Briefcase,
  Volunteering: HandHeart,
  Languages: Languages,
  Education: GraduationCap,
  Projects: Briefcase,
  Blog: PenLine,
  Aperture: Aperture,
};

interface SectionHeadingProps {
  index?: string;
  title: string;
  description?: string;
  className?: string;
}

export default function SectionHeading({
  index,
  title,
  description,
  className,
}: SectionHeadingProps) {
  const Icon = ICONS[title];
  return (
    <Reveal className={cn("mb-12", className)}>
      <div className="flex items-center gap-4">
        {index && (
          <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {index}
          </span>
        )}
        <h2 className="flex items-center gap-3 font-hand text-4xl tracking-tight sm:text-5xl">
          {Icon && (
            <Icon
              size={30}
              strokeWidth={1.5}
              className="shrink-0 text-foreground/70"
              aria-hidden="true"
            />
          )}
          {title}
        </h2>
      </div>
      {description && (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="hairline-top mt-8 w-full" />
    </Reveal>
  );
}
