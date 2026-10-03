import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { getStaticPagePaths } from "../lib/sitemap.ts";

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), "portfolio-sitemap-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const file of files) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "");
  }
  return root;
}

test("discovers the homepage, donation page, and future nested pages without a URL list", (t) => {
  const root = fixture(t, ["page.tsx", "bitcoin/page.tsx", "notes/wallet/page.tsx"]);
  assert.deepEqual(new Set(getStaticPagePaths(root)), new Set(["/", "/bitcoin", "/notes/wallet"]));
});

test("route groups organize files without appearing in public URLs", (t) => {
  const root = fixture(t, ["(content)/blog/page.tsx", "(content)/(misc)/about/page.js"]);
  assert.deepEqual(new Set(getStaticPagePaths(root)), new Set(["/blog", "/about"]));
});

test("excludes API, dynamic, private, parallel-slot, and intercepted routes", (t) => {
  const root = fixture(t, [
    "page.tsx", "api/bitcoin/route.ts", "api/internal/page.tsx",
    "blog/[postId]/page.tsx", "[...slug]/page.tsx", "[[...slug]]/page.tsx",
    "_private/page.tsx", "@modal/page.tsx", "(.)photos/page.tsx", "(..)photos/page.tsx",
  ]);
  assert.deepEqual(getStaticPagePaths(root), ["/"]);
});

test("finds supported page extensions but excludes layouts, route handlers, and components", (t) => {
  const root = fixture(t, ["typescript/page.ts", "javascript/page.jsx", "layout.tsx", "feed/route.ts", "components/Card.tsx"]);
  assert.deepEqual(new Set(getStaticPagePaths(root)), new Set(["/typescript", "/javascript"]));
});

test("does not publish duplicate URLs from different route groups", (t) => {
  const root = fixture(t, ["(first)/about/page.tsx", "(second)/about/page.tsx"]);
  assert.deepEqual(getStaticPagePaths(root), ["/about"]);
});
