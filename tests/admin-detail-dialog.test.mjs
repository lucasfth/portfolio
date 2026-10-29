import assert from "node:assert/strict";
import test from "node:test";
import { activateDialog, cronJobDetail } from "../lib/admin/detail-dialog.mjs";

function fakeElement(selectorMap = {}) {
  const listeners = new Map();
  const element = {
    style: {},
    focused: 0,
    ownerDocument: { activeElement: null },
    querySelectorAll(selector) { return selectorMap[selector] ?? []; },
    querySelector(selector) { return selectorMap[selector]?.[0] ?? null; },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    dispatch(type, event) { listeners.get(type)?.(event); },
    focus() { this.focused++; this.ownerDocument.activeElement = this; },
  };
  for (const child of Object.values(selectorMap).flat()) child.ownerDocument = element.ownerDocument;
  return element;
}

const keyEvent = (key, shiftKey = false) => ({ key, shiftKey, prevented: false, preventDefault() { this.prevented = true; } });

test("dialog focuses close, closes on Escape, and restores opener and scroll", () => {
  const close = fakeElement();
  const first = fakeElement();
  const last = fakeElement();
  const dialog = fakeElement({ "[data-dialog-close]": [close], "[data-dialog-focusable]": [first, last] });
  const opener = fakeElement();
  const body = { style: { overflow: "auto" } };
  let closed = 0;
  const cleanup = activateDialog({ dialog, opener, body, onClose: () => closed++ });
  assert.equal(close.focused, 1);
  assert.equal(body.style.overflow, "hidden");
  dialog.dispatch("keydown", keyEvent("Escape"));
  assert.equal(closed, 1);
  cleanup();
  assert.equal(opener.focused, 1);
  assert.equal(body.style.overflow, "auto");
});

test("Tab from the last focusable wraps to the first", () => {
  const close = fakeElement();
  const first = fakeElement();
  const last = fakeElement();
  const dialog = fakeElement({ "[data-dialog-close]": [close], "[data-dialog-focusable]": [first, last] });
  const cleanup = activateDialog({ dialog, opener: fakeElement(), body: { style: {} }, onClose() {} });
  dialog.ownerDocument.activeElement = last;
  const event = keyEvent("Tab");
  dialog.dispatch("keydown", event);
  assert.equal(event.prevented, true);
  assert.equal(first.focused, 1);
  cleanup();
});

test("Shift+Tab from the first focusable wraps to the last", () => {
  const close = fakeElement();
  const first = fakeElement();
  const last = fakeElement();
  const dialog = fakeElement({ "[data-dialog-close]": [close], "[data-dialog-focusable]": [first, last] });
  const cleanup = activateDialog({ dialog, opener: fakeElement(), body: { style: {} }, onClose() {} });
  dialog.ownerDocument.activeElement = first;
  const event = keyEvent("Tab", true);
  dialog.dispatch("keydown", event);
  assert.equal(event.prevented, true);
  assert.equal(last.focused, 1);
  cleanup();
});

test("cron detail model allowlists safe fields and withholds path, traceback and token details", () => {
  const job = { id: "j1", name: "Daily report", kind: "information", enabled: true, status: "failed", lastRun: "2026-10-28T06:15:00Z", nextRun: "2026-10-29T06:15:00Z", reference: "run-abc", referenceType: "run", summary: "The scheduled job failed.", details: "/private/path\nTraceback: token=ghp_abcdefghijklmnopqrstuvwxyz123456" };
  const safe = cronJobDetail(job);
  assert.deepEqual(safe, { name: job.name, kind: job.kind, enabled: job.enabled, status: job.status, lastRun: job.lastRun, nextRun: job.nextRun, summary: job.summary, referenceType: job.referenceType, reference: job.reference, detailsWithheld: true });
  assert.doesNotMatch(JSON.stringify(safe), /private\/path|Traceback|ghp_/);
});
