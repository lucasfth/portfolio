# Admin chart axes and finance-card interaction

Scope approved by Lucas: add missing chart axes and open finance details by clicking the account cards rather than a separate button. No new data requests/dependencies or source changes.

1. Add failing rendered chart assertions for a price axis with currency, numeric ticks, observation-order X-axis and flat/negative range handling. Render axes/grid beside the existing chart using HTML labels for legibility at mobile widths. The source has no per-close dates, so never invent date labels. Preserve numeric history and no-history fallback.
2. Replace the two finance account tile wrappers with native buttons, accessible names, aria-haspopup=dialog and visible focus/hover. Disable while no payload exists. Keep the external Actual link outside; remove the standalone breakdown button. Verify existing finance detail data/scroll/focus behavior remains.
3. Run focused/full tests, typecheck/build; exercise both cards, keyboard activation, focus return and axis alignment at mobile/desktop in both themes through existing dedicated browser and synthetic fixtures. Independent read-only exact-diff review, task-branch PR checks then rebase integration under current full-send. Preserve generated AGENTS.md, revert only RSS build timestamps, clean task preview processes.
