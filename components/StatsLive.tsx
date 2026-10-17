"use client";

import { useEffect, useMemo, useState } from "react";
import type { StatsOverview } from "@/lib/stats/store";

const REFRESH_MS = 30_000;
const HOURS = 48;

const numberFormat = new Intl.NumberFormat("en-GB");

type HourCell = { key: string; count: number; label: string };

function hourKey(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hour = String(d.getUTCHours()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${day}T${hour}`;
}

function cphTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cphClock(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-foreground/[0.03] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold tracking-tight">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function TopList({ heading, rows }: { heading: string; rows: { name: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div>
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
        {heading}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground/70">Nothing recorded yet.</p>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, index) => (
            <li key={`${row.name}-${index}`} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 font-mono text-xs">
                <span className="truncate text-foreground" title={row.name}>
                  {index + 1}. {row.name}
                </span>
                <span className="shrink-0 text-muted-foreground">{numberFormat.format(row.count)}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full rounded-full bg-foreground/70"
                  style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function StatsLive({
  initial,
  available,
}: {
  initial: StatsOverview;
  available: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<StatsOverview>(initial);
  const [stale, setStale] = useState(!available);
  const [ready, setReady] = useState(available);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/stats/overview", { cache: "no-store" });
        if (!res.ok) throw new Error("stats_not_ok");
        const next = (await res.json()) as StatsOverview;
        if (cancelled) return;
        if (typeof next?.total !== "number") throw new Error("stats_bad_shape");
        setData(next);
        setReady(true);
        setStale(false);
        setUpdatedAt(new Date());
      } catch {
        if (!cancelled) setStale(true);
      }
    };
    void tick();
    const interval = window.setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [available]);

  // Fills the 48-hour window with zero buckets so gaps stay visible.
  const hours = useMemo<HourCell[]>(() => {
    const seen = new Map(
      data.hourly_48h.map((bucket): [string, number] => [bucket.hour.slice(0, 13), bucket.count])
    );
    const end = new Date();
    end.setUTCMinutes(0, 0, 0);
    const cells: HourCell[] = [];
    for (let i = HOURS - 1; i >= 0; i--) {
      const start = new Date(end.getTime() - i * 3600_000);
      const key = hourKey(start);
      cells.push({ key, count: seen.get(key) ?? 0, label: cphTime(start) });
    }
    return cells;
  }, [data.hourly_48h]);

  if (!mounted) {
    return (
      <div className="space-y-14" aria-hidden="true">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-border/20" />
          ))}
        </div>
        <div className="h-36 animate-pulse rounded-2xl bg-border/20" />
        <div className="grid gap-10 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-border/20" />
          ))}
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <p className="rounded-2xl border border-border bg-foreground/[0.03] p-8 text-sm text-muted-foreground">
        The live stats panel is not available right now. The totals above still hold the
        last known figures.
      </p>
    );
  }

  const max = Math.max(1, ...hours.map((cell) => cell.count));
  const human = data.visitor_kinds.human ?? 0;
  const agent = data.visitor_kinds.agent ?? 0;
  const splitTotal = human + agent;

  return (
    <div className="space-y-14">
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          <span
            className={`inline-block size-1.5 rounded-full ${stale ? "bg-foreground/30" : "animate-pulse bg-foreground"}`}
            aria-hidden="true"
          />
          {stale ? "live updates paused" : "live"}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
          updated {updatedAt ? cphClock(updatedAt) : "just now"} Cph
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="Last hour" value={numberFormat.format(data.last_1h)} sub="visits" />
        <StatTile label="Last 7 days" value={numberFormat.format(data.last_7d)} sub="visits" />
        <StatTile
          label="Unique today"
          value={numberFormat.format(data.unique_today)}
          sub="daily IP hashes, not individual people"
        />
        <StatTile
          label="Bot-labelled beacons"
          value={splitTotal ? `${Math.round((agent / splitTotal) * 100)}%` : "no data"}
          sub={splitTotal ? `${numberFormat.format(agent)} agent, ${numberFormat.format(human)} human` : "waiting for the first visits"}
        />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Visits, last {HOURS} hours
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground/70">
            {hours[0]?.label} to {hours[hours.length - 1]?.label} Cph
          </p>
        </div>
        <div
          className="flex h-32 items-end gap-px"
          role="img"
          aria-label={`Hourly visits for the last ${HOURS} hours, highest ${numberFormat.format(max)} in one hour`}
        >
          {hours.map((cell) => (
            <div
              key={cell.key}
              title={`${cell.label} Copenhagen: ${cell.count} visit${cell.count === 1 ? "" : "s"}`}
              className="flex-1 rounded-t-[2px] bg-foreground/80"
              style={{ height: `${Math.max(cell.count === 0 ? 2 : 8, (cell.count / max) * 100)}%` }}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-10 sm:grid-cols-3">
        <TopList heading="Most visited pages" rows={data.top_paths} />
        <TopList heading="Top referrers" rows={data.top_referrers} />
        <TopList heading="Top areas" rows={data.top_regions} />
      </div>
    </div>
  );
}