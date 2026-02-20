# Palette's Journal

## 2025-02-20 - [Accessibility and Navigation in Navbar]
**Learning:** In simple portfolio projects, standard navigation patterns like linking the logo to home and providing accessible mobile menus are often overlooked. Emojis in navigation links can also clutter screen reader output if not handled properly.
**Action:** Always verify that the brand logo links to the homepage and that mobile menu buttons have appropriate ARIA attributes (aria-label, aria-expanded, aria-controls). Wrap decorative emojis in `aria-hidden="true"`.
