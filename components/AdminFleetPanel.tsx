"use client";
import { useEffect, useState } from "react";
import { sessionFreshness, validateFleet, type FleetSnapshot } from "../lib/admin/fleet.ts";

function timestamp(value: string | null) {
  return value ? new Date(value).toLocaleString("en-GB", { timeZone: "Europe/Copenhagen", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "Not observed";
}
export function FleetView({ data, error, now }: { data: FleetSnapshot | null; error: boolean; now: number }) {
  return <section aria-labelledby="fleet-heading" className="mb-14 border border-border bg-background/40">
    <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-3">
      <div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Personal fleet · read only</p><h2 id="fleet-heading" className="mt-1 text-sm font-medium">Hugi / Pi sessions</h2></div>
      <p className="font-mono text-xs text-muted-foreground">30-second polling · Copenhagen time</p>
    </header>
    <div className="space-y-5 p-5">
      {error ? <p role="status" className="text-sm">Fleet source unavailable. {data ? "Showing last received values; freshness continues to age below." : "No fleet observation available."}</p> : null}
      {!data && !error ? <p role="status" className="text-sm text-muted-foreground">Checking fleet source…</p> : null}
      {data ? <><p className="font-mono text-xs text-muted-foreground">Backend read: {timestamp(data.readAt)}</p>
        <div className="grid gap-5 lg:grid-cols-2">{data.hosts.map(host => {
          const age = host.lastReceivedAt ? now - Date.parse(host.lastReceivedAt) : null;
          const status = age === null ? "Never seen" : age < -30_000 ? "Clock skew" : age > 120_000 ? "Stale" : "Recent receipt";
          return <article key={host.id} className="min-w-0 border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-medium">{host.id === "gimle" ? "Gimle" : "Personal MacBook Pro"}</h3><span className="font-mono text-xs uppercase">{status}</span></div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">Host last receipt: {timestamp(host.lastReceivedAt)}</p>
            {!host.sessions.length ? <p className="mt-3 text-sm text-muted-foreground">{host.lastReceivedAt ? "No sessions within retention. The host was previously seen." : "No report received. Setup or host availability is not established."}</p> : null}
            <ul className="mt-3 divide-y divide-border">{host.sessions.map(session => <li key={session.sessionId} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="break-words text-sm font-medium [overflow-wrap:anywhere]">{session.label}</h4><span className="font-mono text-xs uppercase">{sessionFreshness(session, now)}</span></div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">Pi · {session.sessionId.slice(0, 8)} · Reported: <span className="text-foreground">{session.state}</span></p>
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div><dt className="inline">Source observed: </dt><dd className="inline">{timestamp(session.observedAt)}</dd></div>
                <div><dt className="inline">Backend received: </dt><dd className="inline">{timestamp(session.receivedAt)}</dd></div>
                <div><dt className="inline">Latest completed tool reported: </dt><dd className="inline">{timestamp(session.lastToolCompletedAt)}</dd></div>
              </dl>
            </li>)}</ul>
          </article>;
        })}</div></> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">Native Pi reports state and process heartbeats, not task progress or success. A completed tool can have failed. Stale means reports are old, not that work is stalled. Ended means a reporter sent an end marker; abrupt exits may remain stale. Quiet sessions are not inferred complete.</p>
      <p className="text-xs leading-relaxed text-muted-foreground">Name a session explicitly with /fleet-name. Labels are operator-approved; prompts, paths, terminal titles and tool content are not collected. Ended rows are retained for 24 hours, other sessions for seven days; at most 64 latest sessions per host.</p>
    </div>
  </section>;
}
export default function AdminFleetPanel({ token }: { token: string }) {
  const [data, setData] = useState<FleetSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let alive = true; let inFlight = false; let controller: AbortController | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // Same operator: token renewal restarts I/O, not the retained observation/error.
    setNow(Date.now());
    const load = async () => {
      if (inFlight) return; inFlight = true;
      controller = new AbortController(); timeout = setTimeout(() => controller?.abort(), 10_000);
      try {
        const response = await fetch("/api/admin/fleet", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const text = await response.text(); if (text.length > 256 * 1024) throw new Error("Unavailable");
        const next = validateFleet(JSON.parse(text)); if (alive) { setData(next); setError(false); }
      } catch { if (alive) setError(true); }
      finally { clearTimeout(timeout); inFlight = false; }
    };
    void load(); const poll = setInterval(() => void load(), 30_000); const tick = setInterval(() => setNow(Date.now()), 1_000);
    return () => { alive = false; controller?.abort(); clearTimeout(timeout); clearInterval(poll); clearInterval(tick); };
  }, [token]);
  return <FleetView data={data} error={error} now={now} />;
}
