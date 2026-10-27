# Theme-aware content images

Blog posts and projects accept optional `imageLight` and `imageDark` frontmatter:

```yaml
imageLight: /images/fafnir-latte.png
imageDark: /images/fafnir-mocha.png
```

Existing `image: /images/example.png` continues to work in both themes.
A lone `imageLight` or `imageDark` also works in both themes. With a base
`image` and one variant, the base fills the missing theme. Explicit variants
win over the base. With no sources, no image is rendered.

`frontpage.md` uses the same rules with `heroImage`, `heroImageLight`,
`heroImageDark`, and `profileImage`, `profileImageLight`, `profileImageDark`.
Project cards and both desktop and mobile homepage previews share the rules.
Blog lists are text-only and remain unchanged.

Selection uses native `<picture>` media queries, following the browser's
appearance like the site palette. It works before hydration, without JavaScript,
and when appearance changes. Next.js still generates responsive optimized URLs.
Single-source images retain the existing Next.js Image rendering path.
Open Graph and Twitter cards remain the existing generated cards.

Run `node --experimental-strip-types --test tests/theme-image.test.mjs` for
fallback coverage. Build with `npx next build --webpack`, then run
`node --test tests/theme-image-html.test.mjs` for rendered integration checks.
