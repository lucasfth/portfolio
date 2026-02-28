## 2025-05-15 - [Header Accessibility & Navigation]
**Learning:** Standard web navigation expectations include a clickable brand/logo that returns to the homepage. Missing ARIA labels and states on interactive elements like burger menus can hinder accessibility for screen reader users. Dynamic "active" states for navigation links significantly improve user orientation.
**Action:** Always wrap the brand logo in a link to the root. Ensure all toggle buttons have `aria-label` and `aria-expanded` attributes. Implement visual feedback for the current active route.
