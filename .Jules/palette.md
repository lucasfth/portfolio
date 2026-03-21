## 2025-05-15 - [Header Accessibility & Navigation]
**Learning:** Standard web navigation expectations include a clickable brand/logo that returns to the homepage. Missing ARIA labels and states on interactive elements like burger menus can hinder accessibility for screen reader users. Dynamic "active" states for navigation links significantly improve user orientation.
**Action:** Always wrap the brand logo in a link to the root. Ensure all toggle buttons have `aria-label` and `aria-expanded` attributes. Implement visual feedback for the current active route.

## 2025-05-16 - [Landmarks and Skip Links]
**Learning:** Landmark elements like `<main>` are essential for keyboard and screen reader users to navigate efficiently. A "Skip to content" link provides a quick way to bypass repetitive navigation. Using `tabIndex={-1}` on the target element ensures that focus is programmatically moved correctly across all browsers.
**Action:** Always include a `<main>` landmark. Implement a skip-to-content link that is visually hidden until focused.

## 2025-05-17 - [Smooth Transitions & Reduced Motion]
**Learning:** Global UX enhancements like `scroll-behavior: smooth` should always be gated by a `prefers-reduced-motion: no-preference` media query to ensure accessibility for users with vestibular disorders. Similarly, mobile menu transitions should be handled with CSS properties like `opacity`, `transform`, and `visibility` instead of `display: none` to provide a polished feel while maintaining screen reader compatibility.
**Action:** Wrap smooth scrolling and other motion-heavy UX touches in a media query that respects user motion preferences. Use `visibility: hidden` in conjunction with `opacity: 0` to properly manage accessibility for transitioning elements.
