# Portfolio hierarchy and evidence-based review

## Goal and approved scope
Improve the existing site rather than redesign it. User approved proceeding after the recommendation to move projects above the CV, remove repetition and adopt evidence-based reviews. Preserve current typography, palette, photography, interactions and all career/education details.

## Implementation
- `app/page.tsx`: render four current projects, then three newest blog posts immediately after the hero. Keep complete collection links and all existing About/CV sections below. Preserve collection ordering from the content loader; do not invent featured flags or achievements.
- `public/content/frontpage.md`: remove the duplicate hero tagline and obsolete projects prompt. Preserve all factual biography content.
- `components/SectionHeading.tsx`: keep monochrome icons for the more descriptive preview headings.
- `tests/homepage.test.mjs`: assert production HTML order, preview bounds, full-collection links, preserved CV sections, one H1 and non-repeated tagline.

## Acceptance
Run the consumer tests against baseline to establish failure, then against a local production build. Run TypeScript, build, existing relevant tests and diff hygiene. Check mobile/desktop overflow and reduced-motion visibility in the approved browser if the local preview is reachable; clearly distinguish blocked visual checks from rendered HTML evidence. No new dependency or animation framework.

## Publication
Local branch and patch only. No push, PR creation, merge or deployment without explicit publication approval. The running production site remains unchanged.
