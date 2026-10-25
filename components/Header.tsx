"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { Menu, Search, X } from "lucide-react";
import CommandPalette, { type SearchItem } from "@/components/CommandPalette";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "About", href: "/about" },
  { name: "Projects", href: "/projects" },
  { name: "Blog", href: "/blog" },
  { name: "Aperture", href: "/aperture" },
  { name: "Game", href: "/game" },
  { name: "Radar", href: "/radar" },
  { name: "Stats", href: "/stats" },
];

export default function Header() {
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [searchStatus, setSearchStatus] = useState("idle");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    if (!searchOpen || searchStatus === "ready") return;
    let active = true;
    setSearchStatus("loading");
    fetch("/api/search").then(r => { if (!r.ok) throw new Error("Search unavailable"); return r.json(); })
      .then(items => { if (active) { setSearchItems(items); setSearchStatus("ready"); } })
      .catch(() => { if (active) setSearchStatus("error"); });
    return () => { active = false; };
  }, [searchOpen]);
  const [scrolled, setScrolled] = useState(false);
  const [light, setLight] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: light)").matches
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (e: MediaQueryListEvent) => setLight(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) =>
    latest > 24 ? setScrolled(true) : setScrolled(false)
  );

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(false);
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-4 sm:pt-5"
    >
      <motion.nav
        animate={
          scrolled
            ? {
                borderRadius: 18,
                boxShadow: light
                  ? "0 12px 40px rgba(0,0,0,0.16)"
                  : "0 12px 40px rgba(0,0,0,0.45)",
                backgroundColor: light
                  ? "rgba(255,255,255,0.78)"
                  : "rgba(12,12,14,0.72)",
              }
            : {
                borderRadius: 999,
                boxShadow: light
                  ? "0 4px 20px rgba(0,0,0,0.10)"
                  : "0 4px 20px rgba(0,0,0,0.25)",
                backgroundColor: light
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(12,12,14,0.45)",
              }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "flex w-full max-w-4xl items-center justify-between px-4 sm:px-6",
          "glass backdrop-blur-xl",
          open ? "h-auto min-h-[64px]" : "h-16"
        )}
        aria-label="Primary"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 pl-1"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          {/* hbit mark from lucasfth/brand v1; follows the browser appearance like the rest of the site. */}
          <picture className="size-8 shrink-0">
            <source srcSet="/brand/hbit-mark-warm-on-light.svg" media="(prefers-color-scheme: light)" />
            <img src="/brand/hbit-mark-warm-on-dark.svg" alt="" width={32} height={32} className="size-8" />
          </picture>
          <span className="font-heading whitespace-nowrap text-lg font-semibold tracking-tight">Lucas Hanson</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="relative px-2.5 py-2">
              <span
                className={cn(
                  "text-xs font-medium uppercase tracking-[0.14em] transition-colors duration-300",
                  isActive(item.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.name}
              </span>
              {isActive(item.href) && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-2.5 -bottom-0.5 h-px bg-foreground"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-1 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Search the site (⌘K)"
          >
            <Search size={15} aria-hidden="true" />
            <kbd className="font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden grid size-10 place-items-center text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </motion.nav>

      {/* Mobile menu */}
      {open && (
        <motion.div
          id="mobile-menu"
          ref={menuRef}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="lg:hidden fixed inset-x-4 top-[88px] z-50 glass rounded-2xl p-2"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setSearchOpen(true);
            }}
            className="block w-full rounded-xl px-4 py-3 text-left text-sm uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Search
          </button>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.14em] transition-colors",
                isActive(item.href)
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}
        </motion.div>
      )}
      <CommandPalette
        status={searchStatus}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={searchItems.filter((item) => item.href !== pathname)}
      />
    </motion.header>
  );
}
