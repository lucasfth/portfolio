"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { searchItems, type SearchItem } from "@/lib/search";
export type { SearchItem } from "@/lib/search";

export default function CommandPalette({
  open,
  onClose,
  items,
  status = "ready",
}: {
  open: boolean;
  onClose: () => void;
  items: SearchItem[];
  status?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const matches = useMemo(() => searchItems(items, query), [items, query]);

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
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedIndex((prev) => (matches.length ? (prev + 1) % matches.length : 0));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedIndex((prev) => (matches.length ? (prev - 1 + matches.length) % matches.length : 0));
              }
              if (event.key === "Enter" && matches[selectedIndex]) {
                const selected = matches[selectedIndex];
                if (selected.external) window.open(selected.href, "_blank", "noopener,noreferrer");
                else window.location.assign(selected.href);
                onClose();
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
            matches.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={onClose}
                onMouseEnter={() => setSelectedIndex(index)}
                aria-selected={index === selectedIndex}
                className={`flex items-center justify-between gap-4 rounded-xl px-3 py-3 text-sm transition-colors ${
                  index === selectedIndex ? "bg-foreground/10" : "hover:bg-foreground/5"
                }`}
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
            <p className="px-3 py-6 text-sm text-muted-foreground">{status === "loading" || status === "idle" ? "Loading search…" : status === "error" ? "Search unavailable. Close and reopen to retry." : "No matches."}</p>
          )}
        </div>
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          ↑↓ to navigate · Enter to select · Esc to close
        </p>
      </div>
    </div>
  );
}
