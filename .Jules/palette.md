## 2025-05-15 - [Header Accessibility & Navigation]
**Learning:** Standard web navigation expectations include a clickable brand/logo that returns to the homepage. Missing ARIA labels and states on interactive elements like burger menus can hinder accessibility for screen reader users. Dynamic "active" states for navigation links significantly improve user orientation.
**Action:** Always wrap the brand logo in a link to the root. Ensure all toggle buttons have `aria-label` and `aria-expanded` attributes. Implement visual feedback for the current active route.

## 2025-05-16 - [Landmarks and Skip Links]
**Learning:** Landmark elements like `<main>` are essential for keyboard and screen reader users to navigate efficiently. A "Skip to content" link provides a quick way to bypass repetitive navigation. Using `tabIndex={-1}` on the target element ensures that focus is programmatically moved correctly across all browsers.
**Action:** Always include a `<main>` landmark. Implement a skip-to-content link that is visually hidden until focused.

## 2025-05-17 - [Smooth Transitions & Reduced Motion]
**Learning:** Global UX enhancements like `scroll-behavior: smooth` should always be gated by a `prefers-reduced-motion: no-preference` media query to ensure accessibility for users with vestibular disorders. Similarly, mobile menu transitions should be handled with CSS properties like `opacity`, `transform`, and `visibility` instead of `display: none` to provide a polished feel while maintaining screen reader compatibility.
**Action:** Wrap smooth scrolling and other motion-heavy UX touches in a media query that respects user motion preferences. Use `visibility: hidden` in conjunction with `opacity: 0` to properly manage accessibility for transitioning elements.

## 2025-05-18 - [Modal Accessibility and Scroll Management]
**Learning:** For a truly accessible modal experience, it is critical to handle keyboard interactions like the `Escape` key for closing and manage body scroll locking to prevent "scroll leak" behind the overlay. Using semantic `<button>` elements for image triggers instead of generic `<div>` tags ensures that screen readers and keyboard users can interact with gallery items.
**Action:** Always implement an `Escape` key listener for modals and use `document.body.style.overflow = 'hidden'` (and restore it) to lock background scrolling. Use semantic buttons with descriptive `aria-label`s for all interactive gallery items.

## 2025-05-19 - [Gallery Keyboard and Visual Navigation]
**Learning:** Image galleries that open in a full-screen overlay should not only support keyboard dismissal (Escape) but also keyboard navigation (Arrow keys). Relying solely on a "Close" button forces excessive mouse/touch interaction. Providing large, accessible visual navigation buttons helps both mouse and touch users discover that there's more to see.
**Action:** Always implement `ArrowLeft` and `ArrowRight` keyboard listeners for image overlays. Provide visual "Previous" and "Next" buttons with clear ARIA labels and focus states.

## 2025-05-20 - [Loading States for High-Res Images]
**Learning:** High-resolution image galleries can feel unresponsive if there is no feedback during the transition between images or upon initial enlargement. Implementing a loading spinner and using CSS transitions to fade images in once they've loaded prevents "content flashing" and provides clear feedback that the application is working.
**Action:** Use an `onLoad` handler on image elements to track loading state. Provide a visual indicator (like a spinner) and use a CSS `opacity` transition to smoothly reveal images once fully loaded.

## 2026-05-02 - [Gallery Accessibility and Keyboard Navigation]
**Learning:** Wrapping interactive gallery previews in semantic `Link` components instead of generic `div` elements with `onClick` handlers is essential for keyboard accessibility and screen reader support. Adding `:focus-visible` styles ensures a clear visual indicator for users navigating with a keyboard.
**Action:** Always use semantic interactive elements (like `Link` or `button`) for gallery triggers and ensure they have descriptive `aria-label`s and visible focus states.
