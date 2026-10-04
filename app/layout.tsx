import "./globals.css";
import Script from "next/script";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SmoothScroll from "@/components/SmoothScroll";
import ClickSpark from "@/components/ClickSpark";
import Header from "@/components/Header";
import { type SearchItem } from "@/components/CommandPalette";
import { getBlogPosts, getGalleries, getProjects } from "@/lib/content";

const SITE_URL = "https://lucashanson.dk";

const EXTERNAL_SEARCH_ITEMS: SearchItem[] = [
  { title: "GitHub", href: "https://links.lucashanson.dk/gh", external: true },
  { title: "Instagram", href: "https://links.lucashanson.dk/ig", external: true },
  { title: "YouTube", href: "https://links.lucashanson.dk/yt", external: true },
  { title: "LinkedIn", href: "https://links.lucashanson.dk/li", external: true },
  { title: "Email Lucas", href: "mailto:contact@lucashanson.dk", external: true },
  { title: "All links", href: "https://links.lucashanson.dk", external: true },
];

function getSearchItems(): SearchItem[] {
  return [
    { title: "About Lucas", href: "/", description: "Software engineer and photographer" },
    { title: "Projects", href: "/projects", description: "Software projects" },
    { title: "Blog", href: "/blog", description: "Writing and notes" },
    { title: "Aperture", href: "/aperture", description: "Photography" },
    { title: "Bitcoin donations", href: "/bitcoin", description: "Support this work" },
    ...getProjects().map((project) => ({
      title: project.title,
      href: `/projects/${project.slug}`,
      description: project.description,
    })),
    ...getBlogPosts().map((post) => ({
      title: post.title,
      href: `/blog/${post.slug}`,
      description: post.description,
    })),
    ...getGalleries().map((gallery) => ({
      title: `${gallery.title} photography`,
      href: `/aperture/${gallery.id}`,
      description: gallery.description,
    })),
    ...EXTERNAL_SEARCH_ITEMS,
  ];
}

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lucas Hanson | Software Engineer & Photographer",
    template: "%s | Lucas Hanson",
  },
  description:
    "Software engineer and photographer in Copenhagen. Explore Lucas Hanson's projects, writing and photography.",
  keywords:
    "software developer, portfolio, personal website, IT University of Copenhagen, DHI, hand gesture interaction, hybrid meetings, JavaScript, React, Python, ITU, Lucas Hanson",
  authors: [{ name: "Lucas Frey Torres Hanson" }],
  alternates: {
    canonical: SITE_URL,
    // rss.xml is generated at build time by scripts/generateRSS.js.
    types: { "application/rss+xml": `${SITE_URL}/rss.xml` },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Lucas Hanson",
    title: "Lucas Hanson | Software Engineer & Photographer",
    description:
      "Software engineer and photographer in Copenhagen. Portfolio, projects and writing.",
    images: [`${SITE_URL}/api/og?title=Lucas%20Hanson&subtitle=Software%20Engineer%20%26%20Photographer`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lucas Hanson | Software Engineer & Photographer",
    description:
      "Software engineer and photographer in Copenhagen. Portfolio, projects and writing.",
    images: [`${SITE_URL}/api/og?title=Lucas%20Hanson&subtitle=Software%20Engineer%20%26%20Photographer`],
  },
};

// Strips Grammarly extension attributes before React hydrates to avoid
// hydration mismatches. Kept as a static, non-interactive inline script via
// next/script (beforeInteractive) so it is not flagged as raw HTML injection.
const EXTENSION_CLEANUP = `;(function(){
  try{
    var ATTRS = ['data-new-gr-c-s-check-loaded','data-gr-ext-installed'];
    function clean(){
      try{
        var b = document && document.body;
        if(!b) return false;
        var removed = false;
        ATTRS.forEach(function(a){ if(b.hasAttribute && b.hasAttribute(a)){ b.removeAttribute && b.removeAttribute(a); removed = true; }});
        return removed;
      }catch(e){ return false; }
    }
    if(clean()) return;
    var observer = new MutationObserver(function(mutations, obs){
      if(clean()){ try{ obs.disconnect(); }catch(e){} }
    });
    try{
      observer.observe(document.documentElement || document, { childList: true, subtree: true });
    }catch(e){/* ignore */}
    var attempts = 0;
    var interval = setInterval(function(){ attempts++; if(clean() || attempts>20){ clearInterval(interval); try{ observer.disconnect(); }catch(e){} } }, 50);
  }catch(e){}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchItems = getSearchItems();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;1,700&display=swap"
          rel="stylesheet"
        />
        <Script id="extension-cleanup" strategy="beforeInteractive">
          {EXTENSION_CLEANUP}
        </Script>
      </head>
      <body className="grain">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SmoothScroll>
          <Header searchItems={searchItems} />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <ScrollToTop />
          <ClickSpark />
        </SmoothScroll>
      </body>
    </html>
  );
}
