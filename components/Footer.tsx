import React from "react";
import Link from "next/link";

const SOCIALS = [
  { label: "Instagram", href: "https://links.lucashanson.dk/ig" },
  { label: "YouTube", href: "https://links.lucashanson.dk/yt" },
  { label: "LinkedIn", href: "https://links.lucashanson.dk/li" },
  { label: "GitHub", href: "https://links.lucashanson.dk/gh" },
  { label: "Email", href: "mailto:contact+wp@lucashanson.dk" },
  { label: "Links", href: "https://links.lucashanson.dk" },
];

const NAV = [
  { label: "About me", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Aperture", href: "/aperture" },
];

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-border bg-background px-6 pt-16 pb-10 md:px-12 lg:px-24">
      <div className="relative z-10">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div className="flex flex-col gap-6">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Navigate
            </h3>
            <ul className="flex flex-col gap-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block text-sm tracking-wide text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Socials
            </h3>
            <ul className="flex flex-col gap-3">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm tracking-wide text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {s.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            <p>Copenhagen, Denmark</p>
            <p>Software developer, photographer, occasional barista.</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
            © Lucas Hanson {new Date().getFullYear()}
          </p>
          <a
            href="/rss.xml"
            className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            RSS feed
          </a>
        </div>
      </div>
    </footer>
  );
}
