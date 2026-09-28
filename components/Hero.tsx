"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import FlipText from "./FlipText";

interface HeroProps {
  name: string;
  tagline: string;
  heroImage?: string;
}

export default function Hero({ name, tagline, heroImage }: HeroProps) {
  return (
    <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden">
      {/* Background image */}
      {heroImage && (
        <>
          <div className="absolute inset-0 -z-10">
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
              style={{ filter: "grayscale(60%) brightness(0.45)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
          </div>
        </>
      )}

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[60vw] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, var(--glow) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground"
        >
          <span className="h-px w-8 bg-muted-foreground/40" />
          Portfolio · Copenhagen, DK
        </motion.div>

        <h1 className="font-hand text-[clamp(3.5rem,13vw,11rem)] leading-[0.92] tracking-tight">
          <FlipText delay={0.15} duration={2.4}>
            {name}
          </FlipText>
        </h1>

        {tagline && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {tagline}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/projects"
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform duration-300 hover:-translate-y-0.5"
          >
            View projects
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-foreground/5"
          >
            Read the blog
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60"
        aria-hidden="true"
      >
        Scroll
      </motion.div>
    </section>
  );
}
