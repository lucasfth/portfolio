# Terminal reveal and typography

Approved scope: terminal preset from the top-left corner on hero/page titles and project preview switches. All headings, card titles and the navbar name use the existing hero's Arial/Helvetica family. Keep monospace body text. No animation on article bodies, buttons or navigation.

Implementation: one progressive-enhancement component uses ascii-reveal/core after fonts load. Keep real server markup visible before JavaScript; skip effects under reduced motion, destroy controllers on navigation/unmount, decode preview images before sampling. Use a GitHub commit-pinned dependency because npm returns 404.

Acceptance: typecheck, production build, typography regression, built semantic HTML, desktop/tablet/mobile overflow and font checks, title and preview animation cleanup, reduced-motion and JavaScript-disabled content. Browser checks target a local production build, not production.

Publication boundary: local branch only until explicit approval to push to lucasfth/portfolio. No merge or production deployment.
