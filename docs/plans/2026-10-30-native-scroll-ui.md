# Native scrolling and restrained ObsidianUI styling

## Approved design

Restore native document scrolling, anchors and scrollbars. Keep the front-page photography strip's autoplay, but use a real horizontal scroll container instead of GSAP drag/momentum. Manual wheel, touch and keyboard input stays with the browser. Pause autoplay on hover, keyboard focus and interaction; provide an explicit pause/resume control. Reduced motion disables autoplay and duplicate slides. Gallery navigation stays separate from strip controls.

Borrow ObsidianUI Analytics Dashboard's compact cards, grouped controls and overview hierarchy without importing its demo application or changing data/authentication contracts. Keep existing admin modules, freshness/error semantics and responsive document order. Use the existing Catppuccin accent token: Mocha blue #89b4fa, Latte blue #1e66f5. Limit accent to useful actions, selected states, focus, article links and analytics chart emphasis; leave headings and most surfaces neutral.

Non-goals: new dependencies, analytics ingestion changes, demo metrics, new admin features, content rewrites, commits, publication or deployment.

## Execution

1. **Native page scroll.** Add a regression check; remove SmoothScroll/Lenis mounting and dependency, forced CSS smooth scrolling and scrollbar overrides. Use instant browser-default scroll-to-top while retaining main-content focus. Verify source tests, typecheck and build.
2. **Native image strip with autoplay.** Replace components/DraggableMarquee.tsx with components/ImageMarquee.tsx. Preserve deferred gallery loading, replace transforms/drag physics with scrollLeft-based time-normalized autoplay, pause on interaction/visibility and reduced motion, add a pause control, and remove the wrapping gallery link. Test rendered semantics and the frame lifecycle with the existing Node/React test tools, then exercise the homepage in the approved browser.
3. **Restrained UI.** Refine the existing AdminDashboard board cards, toolbar, panel headers and local navigation. Keep source status/fault and timestamp wording intact. Apply token-based accent to the hero's primary action, project selected state, markdown links, focused controls, active navigation and StatsLive hourly series. Verify existing admin/theme/layout tests and both theme values.
4. **Consumer verification.** Build and run the local production app; expose only the approved loopback preview to Gimle through the existing SSH connection. Use the dedicated browser for screenshots and an isolated fixture-based preview for authenticated admin UI, without bypassing production auth or using private data. Exercise both themes, narrow/wide layouts, reduced motion, autoplay/pause and native scrolling. Report actual browser proof separately from source tests and build.

Rollback: restore only this task's edits. No database migration or runtime deployment is needed. Local preview processes and temporary fixtures are not production changes.
