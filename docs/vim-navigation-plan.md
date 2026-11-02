# Vim-style portfolio navigation

Approved direction: optional Vim-style shortcuts, not a tmux prefix; existing visual identity and ordinary links/Tab remain unchanged. No publication or deployment is authorized.

## Scope and architecture

- Add a shared shortcut registry/controller in `lib/keyboard-navigation.ts`, consumed by one client component mounted beside the existing header. One registry supplies both handler metadata and help rows.
- `j/k` focus the next/previous visible destination in main content; Enter uses native link activation. `gg/G` go to document top/bottom. `g h/a/p/b/f/r/s/c` visit home/about/projects/blog/photography/radar/stats/contact. `/` opens existing site search. Existing Cmd/Ctrl-K remains.
- `?` and a visible help button open an accessible, searchable native dialog. Escape closes; focus returns to the opener. Include a persisted single-key-shortcut switch, readable when shortcuts are off.
- Ignore modified, composing, repeated, prevented and editable-target events; suppress single-key shortcuts in dialogs, mobile navigation and the game/admin. Clear pending sequences on blur, focus change, route change and timeout. Keep browser shortcuts untouched.
- Reuse existing semantic color/type tokens and reduced-motion behavior. No dependency, backend, content rewrite or redesign.

## Acceptance

1. Existing production build and source tests establish baseline before edits; HTTP tests run against a local production server, not an absent port.
2. Write controller/DOM tests first; missing module must fail. Cover sequence timeout/reset, matching registry/help, input/contenteditable/combobox/media exclusions, modifiers, disabled setting, overlays, non-Latin keys, and real focus movement.
3. Add the client component/help UI; wire the existing header search callback and add help entry to mobile menu. Correct any directly encountered search-dialog focus/name defects using the same browser-native dialog behavior.
4. Run controller tests, complete existing tests, typecheck, production build and HTTP agent-readiness suite. Review browser rendering/interaction through approved Gimle tooling where supported; distinguish any unavailable keyboard/viewport path.
5. Deliver local paths, findings, verification receipts and remaining gates. Never imply a source diff is live on production.
