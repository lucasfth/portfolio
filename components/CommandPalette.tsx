"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CircleX, Search, X } from "lucide-react";
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
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    setQuery("");
    setCleared(false);
    setSelectedIndex(0);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    inputRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = originalOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const matches = useMemo(() => searchItems(items, query), [items, query]);

  useEffect(() => {
    if (!listRef.current || !matches.length) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, matches.length]);

  return (
    <dialog
      ref={dialogRef}
      className="site-search-dialog"
      aria-label="Search the site"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.currentTarget === event.target) onClose(); }}
    >
      {open && <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {query ? `${matches.length} result${matches.length === 1 ? "" : "s"} found` : cleared ? "Search query cleared" : ""}
        </span>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setCleared(false); }}
            role="combobox"
            aria-label="Search projects, posts, galleries and links"
            aria-expanded={matches.length > 0}
            aria-controls="search-results-list"
            aria-activedescendant={matches.length > 0 ? `search-result-${selectedIndex}` : undefined}
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
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCleared(true);
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="grid size-9 place-items-center text-muted-foreground hover:text-foreground"
              aria-label="Clear query"
            >
              <CircleX size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center text-muted-foreground hover:text-foreground"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>
        <div id="search-results-list" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {matches.length ? (
            matches.map((item, index) => (
              <a
                key={item.href}
                id={`search-result-${index}`}
                role="option"
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
        <p className="flex flex-wrap items-center gap-1.5 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
          <span>
            <kbd className="rounded border border-border bg-muted/60 px-1 py-0.5 font-mono text-[10px]" aria-label="Up and down arrows">↑↓</kbd> to navigate
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <kbd className="rounded border border-border bg-muted/60 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to select
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <kbd className="rounded border border-border bg-muted/60 px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to close
          </span>
        </p>
      </div>}
    </dialog>
  );
}
