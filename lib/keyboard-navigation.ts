export type Shortcut = { id: string; keys: string[]; description: string; group: string; href?: string };

export const SHORTCUTS: Shortcut[] = [
  { id: "next", keys: ["j"], description: "Focus next content link", group: "Move" },
  { id: "previous", keys: ["k"], description: "Focus previous content link", group: "Move" },
  { id: "top", keys: ["gg"], description: "Go to top", group: "Move" },
  { id: "bottom", keys: ["G"], description: "Go to bottom", group: "Move" },
  { id: "home", keys: ["gh"], description: "Home", group: "Go to", href: "/" },
  { id: "about", keys: ["ga"], description: "About", group: "Go to", href: "/about" },
  { id: "projects", keys: ["gp"], description: "Projects", group: "Go to", href: "/projects" },
  { id: "blog", keys: ["gb"], description: "Blog", group: "Go to", href: "/blog" },
  { id: "aperture", keys: ["gf"], description: "Photography / Aperture", group: "Go to", href: "/aperture" },
  { id: "radar", keys: ["gr"], description: "Radar", group: "Go to", href: "/radar" },
  { id: "stats", keys: ["gs"], description: "Stats", group: "Go to", href: "/stats" },
  { id: "contact", keys: ["gc"], description: "Contact", group: "Go to", href: "/contact" },
  { id: "search", keys: ["/"], description: "Search the site", group: "Discover" },
  { id: "help", keys: ["?"], description: "Show keyboard shortcuts", group: "Discover" },
];

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !("closest" in target)) return false;
  return Boolean((target as Element).closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="spinbutton"], video, audio'));
}

type ShortcutEvent = Pick<KeyboardEvent, "key" | "target" | "preventDefault"> & Partial<KeyboardEvent>;

export function createShortcutHandler({ onAction, enabled = () => true, blocked = () => false, now = Date.now }: {
  onAction: (action: Shortcut) => void;
  enabled?: () => boolean;
  blocked?: () => boolean;
  now?: () => number;
}) {
  let pending = false;
  let started = 0;
  const reset = () => { pending = false; };
  return {
    reset,
    handle(event: ShortcutEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat || isTypingTarget(event.target) || blocked()) {
        reset();
        return;
      }
      if (!enabled()) { reset(); return; }
      if (pending && now() - started >= 1000) reset();
      if (event.key === "Escape") { reset(); return; }
      if (!pending && event.key === "g") {
        pending = true;
        started = now();
        event.preventDefault();
        return;
      }
      const sequence = pending ? `g${event.key}` : event.key;
      reset();
      const action = SHORTCUTS.find(item => item.keys.includes(sequence));
      if (!action) return;
      event.preventDefault();
      onAction(action);
    },
  };
}

export function moveLinkFocus(doc: Document, direction: number): boolean {
  const links = [...doc.querySelectorAll<HTMLAnchorElement>('main a[href]')].filter(link =>
    link.getAttribute("tabindex") !== "-1" && !link.closest('[hidden], [inert], [aria-hidden="true"]') && link.getClientRects().length > 0);
  if (!links.length) return false;
  const current = links.indexOf(doc.activeElement as HTMLAnchorElement);
  const firstVisible = links.findIndex(link => link.getBoundingClientRect().top >= 100);
  const index = current < 0
    ? Math.max(0, firstVisible < 0 ? links.length - 1 : firstVisible)
    : Math.max(0, Math.min(links.length - 1, current + direction));
  links[index].focus({ preventScroll: true });
  links[index].scrollIntoView({ block: "center", behavior: "instant" });
  return true;
}
