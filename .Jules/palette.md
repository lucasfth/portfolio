## 2025-05-15 - [Header Accessibility & Navigation]
**Learning:** Standard web navigation expectations include a clickable brand/logo that returns to the homepage. Missing ARIA labels and states on interactive elements like burger menus can hinder accessibility for screen reader users. Dynamic "active" states for navigation links significantly improve user orientation.
**Action:** Always wrap the brand logo in a link to the root. Ensure all toggle buttons have `aria-label` and `aria-expanded` attributes. Implement visual feedback for the current active route.

## 2025-05-16 - [Landmarks and Skip Links]
**Learning:** Landmark elements like `<main>` are essential for keyboard and screen reader users to navigate efficiently. A "Skip to content" link provides a quick way to bypass repetitive navigation. Using `tabIndex={-1}` on the target element ensures that focus is programmatically moved correctly across all browsers.
**Action:** Always include a `<main>` landmark. Implement a skip-to-content link that is visually hidden until focused.
