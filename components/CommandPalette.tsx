"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";

export type SearchItem = {
  title: string;
  href: string;
  description?: string;
  external?: boolean;
};

export default function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: SearchItem[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((item) => !needle || `${item.title} ${item.description || ""}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [items, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-background/70 px-4 pt-[15vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search the site"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "Enter" && matches[0]) {
                const [first] = matches;
                if (first.external) window.open(first.href, "_blank", "noopener,noreferrer");
                else window.location.assign(first.href);
              }
            }}
            className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search projects, posts, galleries and links"
          />
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center text-muted-foreground hover:text-foreground"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {matches.length ? (
            matches.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={onClose}
                className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 text-sm hover:bg-foreground/10"
              >
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{item.title}</span>
                  {item.description && (
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  )}
                </span>
                {item.external && <ArrowUpRight size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
              </a>
            ))
          ) : (
            <p className="px-3 py-6 text-sm text-muted-foreground">No matches.</p>
          )}
        </div>
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          Enter to open the first result · Esc to close
        </p>
      </div>
    </div>
  );
}
