export const HOST_IDS = ["gimle", "macbook"] as const;
export type HostId = typeof HOST_IDS[number];
export const STATES = ["working", "idle", "blocked", "error", "done", "ended", "unknown"] as const;
export type FleetReport = {
  schemaVersion: 1; hostId: HostId; sessionId: string; label: string;
  state: typeof STATES[number]; observedAt: string; lastToolCompletedAt: string | null;
  startedAt: string; sequence: number;
  workingSince?: string | null; toolsInFlight?: number;
};
export type FleetSession = FleetReport & { receivedAt: string };
export type FleetHost = { id: HostId; lastReceivedAt: string | null; sessions: FleetSession[] };
export type FleetSnapshot = { schemaVersion: 1; readAt: string; hosts: FleetHost[] };
export const REPORT_KEYS = ["schemaVersion", "hostId", "sessionId", "label", "state", "observedAt", "lastToolCompletedAt", "startedAt", "sequence"];

export function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || !keys.every(k => Object.hasOwn(value, k))) throw new Error("Invalid fleet data");
  return value as Record<string, unknown>;
}
export function fleetTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function safeLabel(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 80 && value === value.trim() && /^[A-Za-z0-9 ._-]+$/.test(value);
}
function reportShape(value: unknown, received = false): Record<string, unknown> {
  const enriched = !!value && typeof value === "object" && (Object.hasOwn(value, "workingSince") || Object.hasOwn(value, "toolsInFlight"));
  return exact(value, [...REPORT_KEYS, ...(enriched ? ["workingSince", "toolsInFlight"] : []), ...(received ? ["receivedAt"] : [])]);
}
function fields(p: Record<string, unknown>): void {
  if (p.schemaVersion !== 1 || !HOST_IDS.includes(p.hostId as HostId) || typeof p.sessionId !== "string" || !/^[a-f0-9]{32}$/.test(p.sessionId) || !safeLabel(p.label) || !STATES.includes(p.state as FleetReport["state"]) || !Number.isSafeInteger(p.sequence) || (p.sequence as number) < 0 || !fleetTimestamp(p.observedAt) || !fleetTimestamp(p.startedAt) || p.startedAt > p.observedAt || (p.lastToolCompletedAt !== null && (!fleetTimestamp(p.lastToolCompletedAt) || p.lastToolCompletedAt > p.observedAt))) throw new Error("Invalid fleet data");
  if (Object.hasOwn(p, "workingSince")) {
    if (!Number.isInteger(p.toolsInFlight) || (p.toolsInFlight as number) < 0 || (p.toolsInFlight as number) > 256) throw new Error("Invalid fleet data");
    if (p.state === "working") {
      if (!fleetTimestamp(p.workingSince) || p.workingSince < (p.startedAt as string) || p.workingSince > (p.observedAt as string)) throw new Error("Invalid fleet data");
    } else if (p.workingSince !== null || p.toolsInFlight !== 0) throw new Error("Invalid fleet data");
  }
}
export function validateReport(value: unknown, now = Date.now()): FleetReport {
  const p = reportShape(value); fields(p);
  const observed = Date.parse(p.observedAt as string);
  if (observed < now - 300_000 || observed > now + 30_000 || Date.parse(p.startedAt as string) < now - 366 * 86_400_000) throw new Error("Invalid fleet data");
  return value as FleetReport;
}
export function validateSession(value: unknown): FleetSession {
  const p = reportShape(value, true); fields(p);
  if (!fleetTimestamp(p.receivedAt)) throw new Error("Invalid fleet data");
  return value as FleetSession;
}
export function validateFleet(value: unknown): FleetSnapshot {
  const p = exact(value, ["schemaVersion", "readAt", "hosts"]);
  if (p.schemaVersion !== 1 || !fleetTimestamp(p.readAt) || !Array.isArray(p.hosts) || p.hosts.length !== 2) throw new Error("Invalid fleet data");
  const ids = new Set();
  for (const item of p.hosts) {
    const h = exact(item, ["id", "lastReceivedAt", "sessions"]);
    if (!HOST_IDS.includes(h.id as HostId) || ids.has(h.id) || (h.lastReceivedAt !== null && !fleetTimestamp(h.lastReceivedAt)) || !Array.isArray(h.sessions) || h.sessions.length > 64) throw new Error("Invalid fleet data");
    ids.add(h.id); const sessions = new Set();
    for (const item of h.sessions) {
      const s = validateSession(item);
      if (s.hostId !== h.id || sessions.has(s.sessionId) || h.lastReceivedAt === null || s.receivedAt > (h.lastReceivedAt as string)) throw new Error("Invalid fleet data");
      sessions.add(s.sessionId);
    }
  }
  return value as FleetSnapshot;
}
export function sessionFreshness(session: FleetSession, now = Date.now()): "fresh" | "stale" | "ended" | "clock-skew" {
  if (session.state === "ended") return "ended";
  if (Date.parse(session.receivedAt) > now + 30_000 || Date.parse(session.observedAt) > now + 30_000) return "clock-skew";
  return now - Math.min(Date.parse(session.receivedAt), Date.parse(session.observedAt)) > 120_000 ? "stale" : "fresh";
}
