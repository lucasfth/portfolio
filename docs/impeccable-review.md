# Portfolio: Impeccable audit and critique

## Method

Single-context expert review by Hugi, using the guides-only Impeccable adaptation pinned at upstream `e89e3ada3e875a89ac2c5d33d11e65ebef6fe285`. Production homepage inspected at https://lucashanson.dk; source baseline `ffa8c2bf9c62bf0b4b24c7a624e288a069b7cf37`. The navigation branch was also built and inspected through the dedicated Gimle browser via a temporary loopback-only preview forward.

No upstream detector, independent two-agent design critique, user study, Lighthouse, contrast instrumentation, screen-reader test, touch-device test or mobile viewport run was performed. Screenshot/browser inspection supports visual and pointer observations only; keyboard event/focus controller tests are not proof of the real browser keyboard path. A separate implementation reviewer is a delivery gate, not a substitute for independent design critique. No numerical health/compliance score is justified by this partial pass.

## Verdict and strengths

Keep the identity. The large name, actual photography and project-first composition make this clearly Lucas's portfolio, rather than a generic startup landing page. The restrained Catppuccin palette and split sans-heading/monospaced-body system are coherent. Real projects and substantial recent writing provide evidence rather than invented statistics.

The main opportunity is reducing the effort of reaching a destination and reading the long homepage, not replacing its visual world.

## Findings and disposition

| ID | Priority / evidence | Finding | Smallest useful response |
| --- | --- | --- | --- |
| PORT-01 | P1, baseline source | `components/CommandPalette.tsx` used a modal-styled div without focus containment/return, and its combobox had only a placeholder. Keyboard users could leave the apparent modal and lose their starting position. | Changed in this branch to a named native modal dialog, named combobox, native focus containment and explicit opener restoration. Real keyboard check remains required. |
| PORT-02 | P2, observed page + editorial judgment | The homepage repeats About, work experience, volunteering, writing, languages and education before photography (`app/page.tsx:139` onward). Readers exploring both software and imagery must traverse a résumé-length middle. | Next design pass: consider a concise biography and strongest proof on Home, with full chronology on About. This is a proposal, not an implemented deletion. |
| PORT-03 | P2, observed page + source | Search was advertised only as `⌘K`, and optional efficient keyboard navigation/help was absent. The header has seven destinations while Contact is in the footer (`components/Footer.tsx:15` onward). | Added optional Vim-style accelerators, `/` search, a visible `?` control and searchable bindings sheet. Keep ordinary links/Tab and a persistent single-key off switch. Do not mistake shortcuts for fixing information architecture. |
| PORT-04 | P3, source risk, not measured failure | Hero-image label text uses foreground color over a variable photograph/gradient (`components/Hero.tsx:20`, `.hero-image-label` in `app/globals.css`). Actual contrast depends on image and theme; token values alone cannot prove it. | Measure text-on-image contrast in both themes before calling it a violation; consider a stable backing surface only if measurement fails. Not changed in this navigation slice. |
| PORT-05 | P3, rendered + editorial judgment | Some supporting labels and much body copy are small monospaced text; numerical section labels add navigation-like visual emphasis without being controls. | In a dedicated typography pass, compare reading comfort at narrow widths and zoom, and remove labels only where hierarchy improves. Not an automatic WCAG failure or a reason to replace the whole type system. |

## Tasks considered

- First-time visitor finding software work: a clear hero CTA leads directly to Selected projects; project titles and explicit open controls are present.
- Photography visitor: Aperture is available in the header and hero, so the long homepage is avoidable, though cross-discipline browsing still feels long.
- Keyboard visitor opening search/project: baseline modal issue is source-confirmed; implementation tests exercise matching, timeout, ignored targets, disabled shortcuts and actual DOM focus selection. Native dialog keyboard containment/return and route/scroll keys still require manual browser confirmation.

## Scope and next step

This branch implements only approved navigation/help and the directly related search accessibility repair. No redesign, content changes, dependencies or engine/browser hooks were added. Prioritize verification of this keyboard path, then a separately agreed homepage-distillation pass. Publication, integration and deployment are separate claims.
