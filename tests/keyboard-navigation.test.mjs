import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { SHORTCUTS, createShortcutHandler, isTypingTarget, moveLinkFocus } from "../lib/keyboard-navigation.ts";

const event = (key, extra = {}) => ({ key, target: null, preventDefault() { this.defaultPrevented = true; }, ...extra });
function setup(extra = {}) {
  const actions = [];
  let now = 0;
  const controller = createShortcutHandler({ onAction: action => actions.push(action), now: () => now, ...extra });
  return { ...controller, actions, tick: ms => { now += ms; } };
}

test("registry exposes a unique action for each documented sequence", () => {
  const keys = SHORTCUTS.flatMap(row => row.keys);
  assert.equal(keys.length, new Set(keys).size);
  for (const row of SHORTCUTS) {
    const run = setup();
    for (const key of row.keys[0]) run.handle(event(key));
    assert.equal(run.actions.at(-1)?.id, row.id, row.id);
    assert.ok(row.description);
  }
});

test("g sequences expire, reset and never turn an invalid sequence into another action", () => {
  const run = setup();
  run.handle(event("g")); run.tick(1200); run.handle(event("p"));
  assert.equal(run.actions.length, 0);
  run.handle(event("g")); run.handle(event("p"));
  assert.equal(run.actions.at(-1).href, "/projects");
  run.handle(event("g")); run.reset(); run.handle(event("h"));
  assert.equal(run.actions.length, 1);
  run.handle(event("g")); run.handle(event("j"));
  assert.equal(run.actions.length, 1);
  run.handle(event("j"));
  assert.equal(run.actions.at(-1).id, "next");
});

test("modifiers, composition, repeats, prevented events and text controls are not intercepted", () => {
  const { document } = parseHTML('<html><body><input><textarea></textarea><select></select><div contenteditable=""><span></span></div><div role="combobox" tabindex="0"></div><video controls></video></body></html>');
  const run = setup();
  for (const target of document.body.querySelectorAll("input, textarea, select, span, [role=combobox], video")) {
    assert.equal(isTypingTarget(target), true);
    run.handle(event("j", { target }));
  }
  for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { repeat: true }, { defaultPrevented: true }]) {
    run.handle(event("j", extra));
  }
  run.handle(event("ж"));
  assert.equal(run.actions.length, 0);
  run.handle(event("g")); run.handle(event("p", { ctrlKey: true })); run.handle(event("p"));
  assert.equal(run.actions.length, 0);
});

test("blocked surfaces and disabling shortcuts leave every single-key action untouched", () => {
  let blocked = true;
  let enabled = true;
  const run = setup({ blocked: () => blocked, enabled: () => enabled });
  const key = event("j"); run.handle(key);
  assert.equal(key.defaultPrevented, undefined);
  blocked = false; enabled = false;
  run.handle(event("j")); run.handle(event("/")); run.handle(event("?", { shiftKey: true }));
  assert.deepEqual(run.actions, []);
});

test("link navigation follows actual DOM focus, filters hidden/inert links and does not wrap", () => {
  const { document } = parseHTML('<html><body><main><a href="/a">A</a><a href="/hidden" hidden>Hidden</a><div inert><a href="/inert">Inert</a></div><a href="/b">B</a><a href="/c" tabindex="-1">C</a></main></body></html>');
  let active = null;
  Object.defineProperty(document, "activeElement", { get: () => active });
  const links = [...document.querySelectorAll("a")];
  links.forEach((link, i) => {
    link.getClientRects = () => [{}];
    link.getBoundingClientRect = () => ({ top: 120 + i * 50, bottom: 150 + i * 50 });
    link.focus = () => { active = link; };
    link.scrollIntoView = options => { link.scrolled = options; };
  });
  assert.equal(moveLinkFocus(document, 1), true);
  assert.equal(active.textContent, "A");
  assert.equal(moveLinkFocus(document, 1), true);
  assert.equal(active.textContent, "B");
  moveLinkFocus(document, 1); assert.equal(active.textContent, "B");
  moveLinkFocus(document, -1); assert.equal(active.textContent, "A");
  assert.equal(active.scrolled.behavior, "instant");
});
