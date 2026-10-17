const THROTTLE_MS = 30 * 60_000;
const STORAGE_KEY = "lucashanson-stats-v2";
const seen = new Map<string, number>();
const pending = new Set<string>();

export async function sendVisit(path: string, region: string | null): Promise<boolean> {
  if (pending.has(path)) return false;
  let stored: Record<string, number> = {};
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) {
      stored = Object.fromEntries(Object.entries(value).filter(([, stamp]) =>
        typeof stamp === "number" && Number.isFinite(stamp) && stamp <= Date.now()));
    }
  } catch { /* Blocked or corrupt storage must not block analytics. */ }
  const now = Date.now();
  if (now - Math.max(seen.get(path) ?? 0, stored[path] ?? 0) < THROTTLE_MS) return true;
  pending.add(path);
  try {
    const response = await window.fetch("/api/stats/visit", {
      method: "POST", keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path, region }),
    });
    if (!response.ok) return false;
    seen.set(path, now);
    stored[path] = now;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(
        Object.entries(stored).sort((a, b) => b[1] - a[1]).slice(0, 64)
      )));
    } catch { /* In-memory throttle still works without localStorage. */ }
    return true;
  } catch {
    return false;
  } finally {
    pending.delete(path);
  }
}
