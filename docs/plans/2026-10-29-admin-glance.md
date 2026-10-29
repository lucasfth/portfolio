# Admin at a glance — approved design and implementation

Lucas approved the supplied design and /full-send on 2026-10-29. This records that approval, not a new design gate.

## Design

Borrow Glance's information hierarchy only. Keep portfolio typography, Catppuccin Mocha/Latte tokens, 8px media radius, borders and focus treatment. A compact top strip exposes figures, source faults and freshness. Main column: native fleet, GitHub, overnight and radar summaries with native detail disclosures. Context column: finance, markets and Copenhagen weather. Dedicated cron column. At narrow widths use document priority: main, context, cron; no CSS reordering of keyboard navigation.

Keep Personal GitHub expanded and organizations collapsed, section-local filtering, lower-bound/coverage notices, finance partial-assets and historical assumptions, and fleet source/backend timestamps and provenance. Retain auth, refresh, details and links. No backend, migration, scheduler, credentials, production configuration or dependency changes.

## Behavior slices

1. Reproduce loading failure in existing React/linkedom tests: a heterogeneous panel or empty child is not a text field; fixed 2.5rem cannot bound a multi-line overlay. Add an opt-in measured text-field reveal, retaining ascii-reveal/core. Reserve natural measured height, clip only decorative overlay to its field, rebuild field animation on resize/font completion, support reduced motion and keep readable text in normal flow. Existing unrelated reveals stay unchanged.
2. Replace panel-child loading animation with named text-field placeholders; reveal fetched text fields only, never whole mixed panels. Keep last-good content visible while refreshing and show independent error notices. Test initial/loading/error/empty/long text and refresh retention through compiled components and existing state tests.
3. Recompose existing modules into the responsive board. Add linked fault/summary strip, compact fleet timestamp/provenance disclosures, report detail disclosures; preserve all data. Test document order, accessible names, theme-scoped rules and disclosures.
4. Run existing relevant tests, typecheck, canonical build, built output checks. Record baseline failures separately. Browser acceptance through installed constrained Gimle adapter only (current higher-priority policy supersedes the brief's retired Freyr route); no infrastructure changes. Source/mock acceptance is not live proof.
5. Freeze candidate SHA and paths, request three independent native Pi reviews in exclusive Herdr workspaces/session directories: layout/mobile/accessibility; both themes; ASCII/data/regressions/security. No implementation edits during review. Resolve evidenced defects, rerun checks and re-review affected behavior (maximum three rounds).
6. /full-send permits scoped conventional commit, PR-first push and rebase-merge after gates. Never force-push. Re-fetch main before publication; if main moves, rebase unpublished work and repeat affected checks/review. After approved merge inspect exact Vercel revision and actual available UI. Missing browser capability is a gate, not a login exception.

## Acceptance and rollback

Regression tests must demonstrate red then green. Check narrow and wide wrapping, both themes, reduced motion, initial failure, empty responses and last-good refresh state. Browser viewport/motion capabilities may limit exact responsive pixel checks; record each gap. Baseline before changes: 85/86 admin/fleet/reveal checks pass; existing unrelated reveal test expects a div where the blog cover now uses a figure. No rollback needs schema changes; revert the scoped commit through a reviewed PR if necessary.
