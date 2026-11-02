import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("help is wired to a visible control, registry and native modal, not a standalone mock", () => {
  const header = source("components/Header.tsx");
  const help = source("components/KeyboardNavigation.tsx");
  assert.match(header, /<KeyboardNavigation[^>]*onSearch=\{openSearch\}/);
  assert.match(header, /aria-label="Keyboard shortcuts \(\?\)"/);
  assert.match(help, /SHORTCUTS\.map/);
  assert.match(help, /dialog\.showModal\(\)/);
  assert.match(help, /dialog\.close\(\)/);
  assert.match(help, /opener\?\.isConnected/);
  assert.match(help, /localStorage\.setItem/);
  assert.match(help, /window\.addEventListener\("keydown", controller\.handle\)/);
  assert.match(help, /window\.removeEventListener\("keydown", controller\.handle\)/);
});

test("site search has a named combobox, native modal focus containment and opener restoration", () => {
  const search = source("components/CommandPalette.tsx");
  assert.match(search, /<dialog/);
  assert.match(search, /dialog\.showModal\(\)/);
  assert.match(search, /dialog\.close\(\)/);
  assert.match(search, /opener\?\.isConnected/);
  assert.match(search, /aria-label="Search projects, posts, galleries and links"/);
});
