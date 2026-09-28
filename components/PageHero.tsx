"use client";

import React from "react";
import { motion } from "motion/react";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

/** Consistent hero header for internal pages. */
export default function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-12 sm:pt-40 sm:pb-16">
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[50vw] w-[50vw] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-20 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, var(--glow) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="mx-auto w-full max-w-6xl">
        {eyebrow && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground"
          >
            <span className="h-px w-8 bg-muted-foreground/40" />
            {eyebrow}
          </motion.div>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="font-hand text-5xl leading-none tracking-tight sm:text-7xl"
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground"
          >
            {description}
          </motion.p>
        )}
      </div>
    </section>
  );
}
