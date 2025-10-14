import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Lucas Hanson",
  description:
    "Explore Lucas Frey Torres Hanson's portfolio and IT related blog. Discover projects, insights, and tutorials on software development and web technologies.",
  keywords:
    "software developer, portfolio, personal website, IT University of Copenhagen, DHI, hand gesture interaction, hybrid meetings, JavaScript, React, Python, ITU, Lucas Hanson",
  authors: [{ name: "Lucas Frey Torres Hanson" }],
};

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
        <link rel="canonical" href="https://lucashanson.dk" />
        {/* remove common extension attributes before React hydrates to avoid hydration mismatches
            Uses a MutationObserver so we catch attributes added after this script runs (race with extensions) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `;(function(){
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

    // If body already exists and attributes present, remove them and return
    if(clean()) return;

    // Observe for body creation or attribute changes and remove attributes as soon as they appear
    var observer = new MutationObserver(function(mutations, obs){
      if(clean()){
        try{ obs.disconnect(); }catch(e){}
      }
    });

    // Observe the document for childList changes so we detect when body is added
    try{
      observer.observe(document.documentElement || document, { childList: true, subtree: true });
    }catch(e){/* ignore */}

    // Also periodically attempt a cleanup for a short window as a fallback
    var attempts = 0;
    var interval = setInterval(function(){ attempts++; if(clean() || attempts>20){ clearInterval(interval); try{ observer.disconnect(); }catch(e){} } }, 50);
  }catch(e){}
})();`,
          }}
        />
      </head>
      <body>
        <div className="App">
          <Header />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
