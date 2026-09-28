import "./globals.css";
import Script from "next/script";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SmoothScroll from "@/components/SmoothScroll";
import ClickSpark from "@/components/ClickSpark";

const SITE_URL = "https://lucashanson.dk";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Lucas Hanson",
  description:
    "Explore Lucas Frey Torres Hanson's portfolio and IT related blog. Discover projects, insights, and tutorials on software development and web technologies.",
  keywords:
    "software developer, portfolio, personal website, IT University of Copenhagen, DHI, hand gesture interaction, hybrid meetings, JavaScript, React, Python, ITU, Lucas Hanson",
  authors: [{ name: "Lucas Frey Torres Hanson" }],
  alternates: {
    canonical: SITE_URL,
    // rss.xml is generated at build time by scripts/generateRSS.js.
    rss: `${SITE_URL}/rss.xml`,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Lucas Hanson",
    title: "Lucas Hanson",
    description:
      "Software developer & photographer based in Copenhagen. Portfolio, projects and blog.",
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
        <link rel="canonical" href={SITE_URL} />
        <Script id="extension-cleanup" strategy="beforeInteractive">
          {EXTENSION_CLEANUP}
        </Script>
      </head>
      <body className="grain">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SmoothScroll>
          <Header />
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
