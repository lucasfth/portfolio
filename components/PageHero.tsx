import React from "react";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

/** Consistent hero header for internal pages. */
export default function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden pt-32 pb-12 sm:pt-40 sm:pb-16">
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[50vw] w-[50vw] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-20 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, var(--glow) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="mx-auto w-full max-w-6xl px-6">
        {eyebrow && (
          <div
            className="rise mb-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground"
          >
            <span className="h-px w-8 bg-muted-foreground/40" />
            {eyebrow}
          </div>
        )}
        <h1
          style={{ "--rise-delay": "0.05s" } as React.CSSProperties}
          className="font-heading text-5xl leading-none tracking-tight sm:text-7xl"
        >
          {title}
        </h1>
        {description && (
          <p
            data-terminal-heading
            className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground"
          >
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
