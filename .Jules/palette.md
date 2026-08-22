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

## 2025-05-22 - [Mobile Navigation Closure Patterns]
**Learning:** For mobile navigation menus that overlay content, users expect to be able to close the menu using the `Escape` key or by clicking anywhere outside the menu container. Implementing these listeners on the `window` or `document` only when the menu is open improves the perceived responsiveness and accessibility of the interface.
**Action:** Use a `useRef` to track the navigation container and implement `Escape` and click-outside listeners in a `useEffect` that triggers when the menu state is `open`.

## 2026-06-06 - [Modal Focus Management]
**Learning:** Proper focus management in modals/overlays is a critical accessibility requirement often missed in image galleries. This includes trapping focus within the modal, setting initial focus to a sensible element (like the Close button), and restoring focus to the original trigger upon closure.
**Action:** Always implement a focus trap using `onKeyDown` to capture `Tab` and `Shift+Tab`. Store the `document.activeElement` before opening the modal to restore it on close. Use a small `setTimeout` or `useEffect` to ensure focus is applied after the DOM has rendered.

## 2026-06-25 - [Scroll to Top Micro-UX]
**Learning:** For long-form content websites like portfolios and blogs, a "Scroll to Top" button significantly enhances navigation efficiency once the user has scrolled past the initial fold. Using smooth scrolling and subtle transitions provides a delightful feel without being intrusive.
**Action:** Implement a floating action button that appears after a scroll threshold (e.g., 300px), ensuring it has proper ARIA labels and respects the design system's accent colors.

## 2025-06-15 - [404 Page Refactoring and Semantic Navigation]
**Learning:** Using a non-semantic button with `window.location.href` for homepage redirection on a 404 page creates a jarring full-page reload and is less accessible than a standard link. Refactoring to a Next.js `Link` component provides a smoother SPA transition. Additionally, moving inline styles to a dedicated CSS file that utilizes design system variables (`--accent`, `--shadow`) ensures the 404 page remains visually consistent across light and dark modes.
**Action:** Always prefer semantic `Link` components for internal navigation. Avoid inline styles and instead use CSS files integrated with the design system's variable-based tokens to ensure theme-aware styling and better maintainability.

## 2025-07-25 - [Lightbox Overlay Spatial Awareness]
**Learning:** Image lightboxes that lack index counters disorient users by providing no sense of location or gallery size. Implementing a dynamic text indicator (e.g. "1 / 4") wrapped in an `aria-live="polite"` container bridges this gap, providing visual structure for standard users and real-time announcements of spatial updates for assistive technologies.
**Action:** Always complement modal or lightbox image navigation with dynamic positional indicators that use polite ARIA announcements to keep assistive technologies informed of real-time state changes.

## 2025-08-08 - [Scroll to Top Focus Management]
**Learning:** Back-to-top scroll buttons are excellent for usability on long pages, but they often leave keyboard and screen reader focus stranded at the bottom of the document. Programmatically shifting focus to the main content landmark using `focus({ preventScroll: true })` immediately allows assistive technology users to resume content consumption from the top without conflicting with smooth scroll behavior.
**Action:** When scroll-to-top buttons are activated, shift active keyboard focus back to the top-most main content landmark programmatically.

## 2025-08-09 - [Accessible Clipboard Copy Notifications]
**Learning:** Simply updating an interactive button's text or ARIA label from "Copy" to "Copied" does not guarantee screen reader software will announce the change. Utilizing an visually-hidden (`sr-only`) live region (`aria-live="polite"`) guarantees real-time verbal confirmation when content is successfully copied.
**Action:** Complement interactive action indicators (like copying to clipboard) with visually hidden `aria-live` regions to ensure non-visual users are notified of state changes.

## 2025-08-10 - [Visual Keyboard Shortcut Hints in Overlays]
**Learning:** Full-screen modal overlays (such as image lightboxes) that support keyboard navigation (Escape to close, Arrow keys to navigate) often leave visual keyboard users guessing which keys are functional. Providing explicit visual `<kbd>` shortcut hints marked with `aria-hidden="true"` informs keyboard users of available shortcuts without causing redundant or confusing announcements for screen reader users who already rely on semantic buttons and ARIA live regions.
**Action:** Include styled visual `<kbd>` hints on modal overlays for keyboard controls, and always annotate them with `aria-hidden="true"` to keep screen reader feedback clean and un-cluttered.
