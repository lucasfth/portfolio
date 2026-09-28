"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/content";

function formatDate(iso: string): string {
  if (!iso || iso === "1970-01-01") return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Minimal editorial row for a blog post in the index.
 */
export default function PostRow({ post, index }: { post: BlogPost; index: number }) {
  const date = formatDate(post.date);
  return (
    <Link
      href={`/blog/${encodeURIComponent(post.slug)}`}
      className="group flex items-center justify-between gap-6 border-b border-border py-6 transition-colors duration-300 hover:bg-foreground/[0.03]"
    >
      <div className="flex min-w-0 items-baseline gap-6">
        <span className="hidden font-mono text-xs text-muted-foreground sm:block">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-hand text-2xl tracking-tight sm:text-3xl">
            {post.title}
          </h3>
          {post.description && (
            <p className="mt-1 line-clamp-2 max-w-xl text-sm text-muted-foreground">
              {post.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {date && (
          <span className="hidden font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground md:block">
            {date}
          </span>
        )}
        <span className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-300 group-hover:border-border-strong group-hover:text-foreground">
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
