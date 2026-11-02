"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { SHORTCUTS, createShortcutHandler, moveLinkFocus } from "@/lib/keyboard-navigation";

const PREFERENCE = "portfolio-single-key-shortcuts";

export default function KeyboardNavigation({ open, onOpen, onClose, onSearch, blocked }: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSearch: () => void;
  blocked: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try { setEnabled(localStorage.getItem(PREFERENCE) !== "off"); } catch { /* Optional preference; navigation works without storage. */ }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    setQuery("");
    dialog.showModal();
    inputRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    const controller = createShortcutHandler({
      enabled: () => enabled,
      blocked: () => blocked || /^\/(game|admin)(\/|$)/.test(pathname) || Boolean(document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')),
      onAction: action => {
        if (action.href) router.push(action.href);
        else if (action.id === "help") onOpen();
        else if (action.id === "search") onSearch();
        else if (action.id === "next") moveLinkFocus(document, 1);
        else if (action.id === "previous") moveLinkFocus(document, -1);
        else if (action.id === "top" || action.id === "bottom") {
          window.scrollTo({ top: action.id === "top" ? 0 : document.documentElement.scrollHeight, behavior: "instant" });
        }
      },
    });
    window.addEventListener("keydown", controller.handle);
    window.addEventListener("blur", controller.reset);
    document.addEventListener("focusin", controller.reset);
    return () => {
      controller.reset();
      window.removeEventListener("keydown", controller.handle);
      window.removeEventListener("blur", controller.reset);
      document.removeEventListener("focusin", controller.reset);
    };
  }, [pathname, enabled, blocked, onOpen, onSearch, router]);

  const rows = [
    ...SHORTCUTS.map(item => ({ ...item, binding: item.keys[0].split("").join(" ") })),
    { id: "activate", description: "Open the focused link", group: "Native controls", binding: "Enter" },
    { id: "tab", description: "Move between all controls", group: "Native controls", binding: "Tab / Shift Tab" },
    { id: "escape", description: "Close search or help", group: "Native controls", binding: "Esc" },
    { id: "command-search", description: "Search the site", group: "Native controls", binding: "⌘ K / Ctrl K" },
  ].filter(item => `${item.description} ${item.binding} ${item.group}`.toLowerCase().includes(query.toLowerCase().trim()));

  return (
    <dialog
      ref={dialogRef}
      className="keyboard-help"
      aria-labelledby="keyboard-help-title"
      aria-describedby="keyboard-help-description"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      {open && <div className="keyboard-help-content">
        <div className="keyboard-help-heading">
          <h2 id="keyboard-help-title">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} aria-label="Close keyboard shortcuts"><X size={20} aria-hidden="true" /></button>
        </div>
        <p id="keyboard-help-description">Vim-style navigation. Press sequence keys one after another, within a second. Enter opens the focused link.</p>
        <p className="keyboard-help-note">Single-key shortcuts pause while typing, in dialogs, and on Game and Admin. Browser shortcuts and Tab still work.</p>
        <label className="keyboard-help-setting">
          <input type="checkbox" checked={enabled} onChange={event => {
            setEnabled(event.target.checked);
            try { localStorage.setItem(PREFERENCE, event.target.checked ? "on" : "off"); } catch { /* Keep the current-session setting. */ }
          }} />
          Enable single-key shortcuts
        </label>
        <label className="keyboard-help-search">
          <span>Find a binding</span>
          <input ref={inputRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by action or key" />
        </label>
        <p className="sr-only" role="status">{rows.length} bindings shown</p>
        <dl className="keyboard-help-bindings">
          {rows.map(row => <div key={row.id}><dt>{row.description}</dt><dd><kbd>{row.binding}</kbd></dd></div>)}
        </dl>
        {!rows.length && <p>No matching bindings. Try an action such as “projects” or “search”.</p>}
        <p className="keyboard-help-note">The ? button always opens this sheet, even with single-key shortcuts turned off.</p>
      </div>}
    </dialog>
  );
}
