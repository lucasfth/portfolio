"use client";

// The /admin overnight module: Supabase email/password sign-in, then a
// control panel that replaces the Telegram morning brief. Live panels
// (radar, stocks, weather, GitHub) fetch through /api/admin/* with the user
// session; the overnight panel reads admin_reports directly with RLS.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, LogOut, RefreshCw } from "lucide-react";
import { browserSupabase } from "@/lib/admin/browser";
import type {
  AdminReport,
  GithubPayload,
  RadarPayload,
  StockPayload,
  WeatherPayload,
} from "@/lib/admin/types";

type SessionShape = {
  access_token: string;
  user: { email?: string | null };
} | null;

type FinanceAccount = { name: string; balance: number; source: string; lastSync: string | null; bankStatus: string | null };
type FinancePayload = { schemaVersion: number; currency: string; generatedAt: string; total: number; mixedDates: boolean; simIncluded: boolean; nordea: { balance: number; status: string; accounts: FinanceAccount[]; lastSync: string | null }; saxo: { total: number; investments: number; cash: number; asOf: string; mode: string; liveSync: boolean }; limitations: string[] };

const FINANCE_ENDPOINT = "https://gimle.tail3e4ba0.ts.net/finance/report";
const ACTUAL_URL = "https://gimle.tail3e4ba0.ts.net:8447";

type Phase = "boot" | "anon" | "auth" | "cfg";
type ModuleState = "loading" | "ok" | "error";

const MONO = "font-mono";
const TRACK = "uppercase tracking-[0.18em]";

function cphNow(full = false): string {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: full ? "short" : undefined,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: full ? "2-digit" : undefined,
  });
}

function cphDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function changeCell(pct: number) {
  if (!Number.isFinite(pct)) return <span className="text-muted-foreground/60">--</span>;
  const up = pct >= 0;
  return (
    <span className={`${MONO} text-xs tabular-nums ${up ? "text-emerald-400/90" : "text-rose-400/90"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function statusState(data: { status: string } | null): ModuleState {
  if (data === null) return "loading";
  return data.status === "ok" ? "ok" : "error";
}

function stateWord(state: ModuleState) {
  return state === "ok" ? "OK" : state === "error" ? "FAULT" : "SYNC";
}

function Dot({ state }: { state: ModuleState }) {
  const cls =
    state === "ok"
      ? "bg-emerald-400/90"
      : state === "error"
        ? "bg-rose-400/90"
        : "animate-pulse bg-muted-foreground/40";
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 ${cls}`} />;
}

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return <span className="inline-block h-[18px] w-16 align-middle" />;
  const w = 64;
  const h = 18;
  const pad = 1.5;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / span) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = pts.split(" ").pop()!.split(",");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className={`shrink-0 ${up ? "text-emerald-400/70" : "text-rose-400/70"}`}
    >
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1} />
      <circle cx={last[0]} cy={last[1]} r={1.5} fill="currentColor" />
    </svg>
  );
}

function Chip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`border px-3 py-1.5 ${MONO} text-[11px] ${TRACK} ${
        on ? "border-emerald-400/40 text-emerald-400/90" : "border-rose-400/40 text-rose-400/90"
      }`}
    >
      {label}: {on ? "OK" : "NO"}
    </span>
  );
}

function LoadingLines() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-3 w-3/4 animate-pulse bg-foreground/[0.06]" />
      <div className="h-3 w-1/2 animate-pulse bg-foreground/[0.06]" />
      <div className="h-3 w-2/3 animate-pulse bg-foreground/[0.06]" />
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  meta,
  state,
  error,
  children,
  className = "",
}: {
  eyebrow: string;
  title?: string;
  meta?: string | null;
  state: ModuleState;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const loading = state === "loading";
  return (
    <section className={`border border-border bg-background/40 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <p className={`${MONO} text-[11px] ${TRACK} text-muted-foreground`}>{eyebrow}</p>
          {title ? <h2 className="truncate text-sm font-medium tracking-tight text-foreground/90">{title}</h2> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {meta ? (
            <span className={`${MONO} text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60`}>{meta}</span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <Dot state={state} />
            <span
              className={`${MONO} text-[10px] ${TRACK} ${
                state === "ok"
                  ? "text-emerald-400/80"
                  : state === "error"
                    ? "text-rose-400/90"
                    : "text-muted-foreground/60"
              }`}
            >
              {stateWord(state)}
            </span>
          </span>
        </div>
      </div>
      <div className="px-5 py-5">
        {loading ? (
          <LoadingLines />
        ) : state === "error" ? (
          <p className={`${MONO} text-xs ${TRACK} text-muted-foreground`}>Unavailable: {error ?? "source error"}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

type BoardCell = {
  code: string;
  state: ModuleState;
  value: string;
  sub: string;
};

function Board({ cells }: { cells: BoardCell[] }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
      {cells.map((c) => (
        <div key={c.code} className="bg-background px-4 py-3">
          <div className="flex items-center justify-between">
            <span className={`${MONO} text-[10px] ${TRACK} text-muted-foreground/70`}>{c.code}</span>
            <span className="flex items-center gap-1.5">
              <Dot state={c.state} />
              <span
                className={`${MONO} text-[10px] ${TRACK} ${
                  c.state === "ok"
                    ? "text-muted-foreground/60"
                    : c.state === "error"
                      ? "text-rose-400/90"
                      : "text-muted-foreground/50"
                }`}
              >
                {stateWord(c.state)}
              </span>
            </span>
          </div>
          <p className="mt-2 truncate text-sm tabular-nums text-foreground/90">{c.value}</p>
          <p className={`${MONO} mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60`}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

function validFinancePayload(value: unknown): value is FinancePayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<FinancePayload>;
  return p.schemaVersion === 1 && p.currency === "DKK" && typeof p.generatedAt === "string" &&
    typeof p.total === "number" && Boolean(p.nordea && p.saxo && Array.isArray(p.limitations)) &&
    typeof p.nordea?.balance === "number" && Array.isArray(p.nordea?.accounts) &&
    typeof p.saxo?.total === "number" && typeof p.saxo?.asOf === "string" &&
    p.nordea.accounts.every(a => typeof a.name === "string" && typeof a.balance === "number" && typeof a.source === "string");
}

async function fetchFinanceReport(token: string): Promise<FinancePayload> {
  const response = await fetch(FINANCE_ENDPOINT, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!validFinancePayload(payload)) throw new Error("Unexpected finance report format");
  return payload;
}

async function refreshFinance(token: string): Promise<FinancePayload> {
  const response = await fetch(FINANCE_ENDPOINT.replace("/report", "/refresh"), {
    method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!validFinancePayload(payload)) throw new Error("Unexpected finance report format");
  return payload;
}

function FinancePanel({ finance, error }: { finance: FinancePayload | null; error: string | null }) {
  const state: ModuleState = finance ? "ok" : error ? "error" : "loading";
  return (
    <Panel eyebrow="Finance" title="Daily follow-up" state={state} error={error} meta={finance ? `report ${fmtTime(finance.generatedAt)}` : "private link"} className="lg:col-span-5">
      {finance ? <>
        <div className="grid gap-3 sm:grid-cols-2">
          {[{label:"Nordea",total:finance.nordea.balance,source:finance.nordea.status,updated:finance.nordea.lastSync},{label:"Saxo",total:finance.saxo.total,source:"Manual statement snapshot",updated:finance.saxo.asOf}].map(item=><div key={item.label} className="border border-border px-4 py-4"><p className={`${MONO} text-[10px] ${TRACK} text-muted-foreground`}>{item.label}</p><p className="mt-3 text-lg tabular-nums">{item.total.toLocaleString("en-GB", { style: "currency", currency: finance.currency })}</p><p className="mt-1 text-sm">{item.source}</p><p className={`${MONO} mt-2 text-[11px] text-muted-foreground`}>Source date: {item.updated ?? "unknown"}</p></div>)}
        </div>
        <p className={`${MONO} mt-4 text-xs text-muted-foreground`}>Combined indicative total: {finance.total.toLocaleString("en-GB", { style: "currency", currency: finance.currency })}. Mixed source dates; manual Saxo valuation is not live sync.</p>
        <ul className={`${MONO} mt-3 space-y-1 text-[11px] text-muted-foreground`}>{finance.limitations.map((x,i)=><li key={i}>{x}</li>)}</ul>
      </> : null}
      <a href={ACTUAL_URL} target="_blank" rel="noopener noreferrer" className={`mt-5 inline-flex items-center gap-2 ${MONO} text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground`}>Open Actual <ArrowUpRight size={14} /></a>
    </Panel>
  );
}

export default function AdminDashboard() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [session, setSession] = useState<SessionShape>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const hydrated = useRef(false);

  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [stocks, setStocks] = useState<StockPayload | null>(null);
  const [github, setGithub] = useState<GithubPayload | null>(null);
  const [radar, setRadar] = useState<RadarPayload | null>(null);
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [finance, setFinance] = useState<FinancePayload | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);

  const hasSession = Boolean(session);

  const api = useCallback(
    async (path: string): Promise<any | null> => {
      if (!session) return null;
      try {
        const res = await fetch(path, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    [session],
  );

  const loadAll = useCallback(async () => {
    const sb = browserSupabase();
    const [w, s, g, r] = await Promise.all([
      api("/api/admin/weather"),
      api("/api/admin/stocks"),
      api("/api/admin/github"),
      api("/api/admin/radar"),
    ]);
    setWeather(w);
    setStocks(s);
    setGithub(g);
    setRadar(r);
    if (session?.access_token) {
      try { const report = await fetchFinanceReport(session.access_token); setFinance(report); setFinanceError(null); }
      catch (error) { setFinance(null); setFinanceError(error instanceof Error ? error.message : "Finance endpoint unavailable"); }
    }
    if (sb) {
      sb.from("admin_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(120)
        .then(({ data, error }) => {
          if (!error && Array.isArray(data)) {
            setReports(
              (data as AdminReport[]).map((r) => ({
                ...r,
                details: r.details && typeof r.details === "object" ? r.details : {},
              })),
            );
          } else {
            setReports([]);
          }
        });
    }
  }, [api, session?.access_token]);

  // Session lifecycle.
  useEffect(() => {
    const sb = browserSupabase();
    if (!sb) {
      setPhase("cfg");
      return;
    }
    let mounted = true;
    sb.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const s = data.session;
        setSession(s ? { access_token: s.access_token, user: { email: s.user.email } } : null);
        setPhase(s ? "auth" : "anon");
      })
      .catch(() => mounted && setPhase("cfg"));
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s ? { access_token: s.access_token, user: { email: s.user.email } } : null);
      setPhase(s ? "auth" : "anon");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Live clock (seconds resolution, control-room cadence).
  useEffect(() => {
    const tick = () => setClock(cphNow(true));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  // Panel fetches, once per sign-in.
  useEffect(() => {
    if (!hasSession || hydrated.current) return;
    hydrated.current = true;
    void loadAll().then(() => setLastSync(cphNow()));
  }, [hasSession, loadAll]);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setWeather(null);
    setStocks(null);
    setGithub(null);
    if (session?.access_token) {
      try { const report = await refreshFinance(session.access_token); setFinance(report); setFinanceError(null); }
      catch (error) { setFinanceError(error instanceof Error ? error.message : "Finance refresh failed"); }
    }
    await loadAll();
    setRefreshing(false);
    setLastSync(cphNow());
  };

  const signIn = async () => {
    const sb = browserSupabase();
    if (!sb) return;
    setBusy(true);
    setSignInError(null);
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setSignInError(error.message);
      return;
    }
    if (data.session) {
      setSession({ access_token: data.session.access_token, user: { email: email.trim() } });
      setPhase("auth");
    }
  };

  const resetPassword = async () => {
    const sb = browserSupabase();
    if (!sb || !email.trim()) return;
    setBusy(true);
    setSignInError(null);
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/admin",
    });
    setBusy(false);
    setSignInError(error ? error.message : "Reset link sent. Check your inbox.");
  };

  const signOut = async () => {
    const sb = browserSupabase();
    await sb?.auth.signOut();
    hydrated.current = false;
  };

  if (phase === "boot") {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-32 sm:pt-40">
        <p className={`${MONO} text-xs ${TRACK} text-muted-foreground`}>Loading</p>
      </div>
    );
  }

  if (phase === "cfg") {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-32 sm:pt-40">
        <p className={`${MONO} text-xs ${TRACK} text-muted-foreground`}>Admin module not configured (Supabase env missing).</p>
      </div>
    );
  }

  if (phase === "anon") {
    return (
      <div className="mx-auto w-full max-w-sm px-6 pb-24 pt-32 sm:pt-40">
        <div className="border border-border bg-background/40 px-8 py-8">
          <div className="flex items-center justify-between">
            <p className={`${MONO} text-[11px] ${TRACK} text-muted-foreground`}>Admin access</p>
            <Dot state="error" />
          </div>
          <h1 className="mt-3 text-2xl font-medium tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The overnight control panel: radar, watchlist, weather, GitHub and what ran while you slept.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
            className="mt-8 space-y-4"
          >
            <input
              type="email"
              required
              aria-label="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-border-strong"
            />
            <input
              type="password"
              required
              aria-label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-border-strong"
            />
            <button
              type="submit"
              disabled={busy}
              className={`w-full border border-foreground bg-foreground py-3 ${MONO} text-xs uppercase tracking-[0.18em] transition-opacity disabled:opacity-50`}
            >
              {busy ? "Signing in" : "Sign in"}
            </button>
            {signInError ? <p className="text-xs text-rose-400/90">{signInError}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={resetPassword}
              className={`w-full border border-border py-3 ${MONO} text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50`}
            >
              Forgot password
            </button>
          </form>
        </div>
        <p className={`${MONO} mt-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50`}>
          Restricted. Sessions are stored locally; row-level security enforces access.
        </p>
      </div>
    );
  }

  // Authed view.
  const reportKinds: { kind: string; label: string }[] = [
    { kind: "tasks", label: "Tasks done overnight" },
    { kind: "vault", label: "Vault maintenance" },
    { kind: "research", label: "Research and drafts" },
    { kind: "calendar", label: "Calendar today" },
    { kind: "news", label: "News" },
    { kind: "weather", label: "Weather" },
    { kind: "stocks", label: "Stocks at close" },
  ];
  const reportsByKind = new Map<string, AdminReport[]>();
  for (const r of reports ?? []) {
    reportsByKind.set(r.kind, [...(reportsByKind.get(r.kind) ?? []), r]);
  }
  const latestNight = (reports ?? [])[0]?.night;
  const tonight = (reports ?? []).filter((r) => !latestNight || r.night === latestNight);

  const ws = statusState(weather);
  const ss = statusState(stocks);
  const gs = statusState(github);
  const rs = statusState(radar);
  const os: ModuleState = reports === null ? "loading" : "ok";

  const stocksList = ss === "ok" ? stocks!.stocks : [];
  const topMover = stocksList.length
    ? stocksList.reduce((a, b) => (Math.abs(b.changePct) >= Math.abs(a.changePct) ? b : a))
    : null;
  const nightLabel = latestNight ? latestNight.slice(5).split("-").reverse().join(" ") : null;

  const cells: BoardCell[] = [
    {
      code: "RDR",
      state: rs,
      value: rs === "ok" ? `${radar!.items.length} items` : rs === "error" ? "feed fault" : "syncing",
      sub: "llm-radar, 2x daily",
    },
    {
      code: "MKT",
      state: ss,
      value:
        ss === "ok" && topMover
          ? `${topMover.symbol} ${topMover.changePct >= 0 ? "▲" : "▼"} ${Math.abs(topMover.changePct).toFixed(1)}%`
          : ss === "error"
            ? "quote fault"
            : "syncing",
      sub: stocksList.length ? `${stocksList.length} names tracked` : "names tracked",
    },
    {
      code: "WX",
      state: ws,
      value:
        ws === "ok" ? `${weather!.current!.temp.toFixed(0)}°C ${weather!.current!.desc}` : ws === "error" ? "wx fault" : "syncing",
      sub: ws === "ok" ? `wind ${weather!.current!.wind.toFixed(0)} km/h · CPH` : "copenhagen",
    },
    {
      code: "GHT",
      state: gs,
      value:
        gs === "ok" ? `${github!.commits.length}c · ${github!.openPulls.length}pr` : gs === "error" ? "gh fault" : "syncing",
      sub: "github, last 24h",
    },
    {
      code: "OVT",
      state: os,
      value: os === "loading" ? "syncing" : nightLabel ?? "standby",
      sub: os === "ok" ? `${tonight.length} reports` : "",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-32 sm:pt-40">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className={`${MONO} text-[11px] ${TRACK} text-muted-foreground`}>Admin</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">Overnight</h1>
          <p className={`${MONO} mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70`}>
            {cphDate()} · Copenhagen
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={refreshing}
              className={`flex items-center gap-2 border border-border px-4 py-2 ${MONO} text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50`}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={signOut}
              className={`flex items-center gap-2 border border-border px-4 py-2 ${MONO} text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground`}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
          <p className={`${MONO} text-xs tabular-nums text-muted-foreground`}>
            {clock}
            <span className="ml-3 text-muted-foreground/60">SYNC {lastSync ?? "--:--:--"}</span>
          </p>
        </div>
      </div>

      <div className="mb-14">
        <Board cells={cells} />
      </div>

      <div className="mb-14">
        <FinancePanel finance={finance} error={financeError} />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
        <Panel
          eyebrow="Radar"
          title="Signal feed"
          state={rs}
          error={radar?.message}
          meta={radar?.generated ? `updated ${fmtTime(radar.generated)}` : "compiled 2x daily"}
          className="lg:col-span-5"
        >
          <ul>
            {(radar && radar.status === "ok" ? radar.items : []).map((item, i) => (
              <li key={item.url} className="border-b border-border last:border-b-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-baseline gap-4 py-3.5 transition-colors duration-300 hover:bg-foreground/[0.03]"
                >
                  <span className={`${MONO} w-6 shrink-0 text-[11px] tabular-nums text-muted-foreground/50`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{item.title}</span>
                    <span className={`${MONO} mt-1 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70`}>
                      {item.source}
                    </span>
                  </span>
                  <span
                    className={`${MONO} hidden shrink-0 border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 sm:inline-block`}
                  >
                    {item.tag}
                  </span>
                  <ArrowUpRight
                    size={15}
                    className="shrink-0 self-center text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </a>
              </li>
            ))}
          </ul>
          <a
            href="/radar"
            className={`mt-6 inline-flex items-center gap-2 ${MONO} text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground`}
          >
            Open the full radar <ArrowUpRight size={14} />
          </a>
        </Panel>

        <Panel
          eyebrow="Market"
          title="Watchlist"
          state={ss}
          error={stocks?.message}
          meta={stocks?.asOf ? `as of ${fmtTime(stocks.asOf)}` : "stooq"}
          className="lg:col-span-3"
        >
          <div
            className={`${MONO} mb-2 flex items-baseline justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50`}
          >
            <span>Symbol</span>
            <span className="flex-1 px-3 text-right">Trend</span>
            <span>Last / Chg</span>
          </div>
          <ul>
            {(stocks && stocks.status === "ok" ? stocks.stocks : []).map((s) => {
              const up = s.changePct >= 0;
              const isTop = topMover?.symbol === s.symbol;
              return (
                <li key={s.symbol} className="flex items-center gap-4 border-b border-border py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className={`${MONO} text-xs uppercase tracking-[0.1em]`}>
                      {s.symbol}
                      {isTop ? (
                        <span
                          className={`${MONO} ml-2 border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80`}
                        >
                          Top
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.name}</p>
                  </div>
                  <Sparkline values={s.closes} up={up} />
                  <div className="w-32 shrink-0 text-right">
                    <span className="text-sm tabular-nums">
                      {s.price.toFixed(2)}
                      <span className={`${MONO} ml-1 text-[11px] text-muted-foreground/70`}>{s.currency}</span>
                    </span>
                    <span className="ml-2 align-middle">{changeCell(s.changePct)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel
          eyebrow="Env"
          title="Copenhagen"
          state={ws}
          error={weather?.message}
          meta={weather?.updated ? `as of ${fmtTime(weather.updated)}` : "wttr.in"}
          className="lg:col-span-2"
        >
          {weather && weather.status === "ok" && weather.current ? (
          <>
          <p className="text-5xl font-light tabular-nums tracking-tight">
            {weather!.current!.temp.toFixed(0)}
            <span className="ml-1 text-2xl text-muted-foreground">°C</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{weather!.current!.desc}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip label="Bike" on={weather!.current!.bike} />
            <Chip label="Waterproof" on={weather!.current!.waterproof} />
          </div>
          {weather!.today ? (
            <dl className={`${MONO} mt-6 space-y-1.5 text-xs uppercase tracking-[0.14em]`}>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground/60">Range</dt>
                <dd className="tabular-nums">
                  {weather!.today!.mint.toFixed(0)}° – {weather!.today!.max.toFixed(0)}°
                </dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground/60">Wind</dt>
                <dd className="tabular-nums">{weather!.current!.wind.toFixed(0)} km/h</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground/60">UV</dt>
                <dd className="tabular-nums">{weather!.today!.uv.toFixed(0)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground/60">Sun</dt>
                <dd className="tabular-nums">
                  {weather!.today!.sunrise} – {weather!.today!.sunset}
                </dd>
              </div>
            </dl>
          ) : null}
          </>
          ) : null}
        </Panel>

        <Panel
          eyebrow="GitHub"
          title="Last 24 hours"
          state={gs}
          error={github?.message}
          meta={`${github?.commits.length ?? "--"} commits`}
          className="lg:col-span-5"
        >
          {github && github.status === "ok" ? (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div>
              <p className={`${MONO} mb-3 text-[11px] ${TRACK} text-muted-foreground`}>Commits</p>
              {github!.commits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Quiet day.</p>
              ) : (
                <ul>
                  {github!.commits.slice(0, 10).map((c) => (
                    <li key={c.repo + c.sha} className="border-b border-border last:border-b-0">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block py-2.5 transition-colors hover:bg-foreground/[0.03]"
                      >
                        <span className="block truncate text-sm">{c.message}</span>
                        <span className={`${MONO} text-[11px] text-muted-foreground/70`}>
                          {c.repo} · {c.author}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className={`${MONO} mb-3 text-[11px] ${TRACK} text-muted-foreground`}>Open pull requests</p>
              {github!.openPulls.length === 0 ? (
                <p className="text-sm text-muted-foreground">None open.</p>
              ) : (
                <ul>
                  {github!.openPulls.map((p) => (
                    <li key={p.repo + p.number} className="border-b border-border last:border-b-0">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block py-2.5 transition-colors hover:bg-foreground/[0.03]"
                      >
                        <span className="block truncate text-sm">{p.title}</span>
                        <span className={`${MONO} text-[11px] text-muted-foreground/70`}>
                          {p.repo} · #{p.number}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className={`${MONO} mb-3 text-[11px] ${TRACK} text-muted-foreground`}>Issues touched</p>
              {github!.issues.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing new.</p>
              ) : (
                <ul>
                  {github!.issues.map((i) => (
                    <li key={i.repo + i.number} className="border-b border-border last:border-b-0">
                      <a
                        href={i.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block py-2.5 transition-colors hover:bg-foreground/[0.03]"
                      >
                        <span className="block truncate text-sm">{i.title}</span>
                        <span className={`${MONO} text-[11px] text-muted-foreground/70`}>
                          {i.repo} · #{i.number} · {i.state}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          ) : null}
        </Panel>

        <Panel
          eyebrow="Overnight"
          title={latestNight ? `Night of ${nightLabel}` : "No reports yet"}
          state={os}
          meta={reports === null ? null : `${tonight.length} reports tonight`}
          className="lg:col-span-5"
        >
          {tonight.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing ran yet. Reports land automatically from the overnight jobs.</p>
          ) : (
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              {reportKinds.map(({ kind, label }) => {
                const rows = reportsByKind.get(kind) ?? [];
                if (rows.length === 0) return null;
                return (
                  <div key={kind}>
                    <p className={`${MONO} mb-3 flex items-baseline justify-between text-[11px] ${TRACK} text-muted-foreground`}>
                      <span>{label}</span>
                      <span className="tabular-nums text-muted-foreground/50">{rows.length}</span>
                    </p>
                    {rows.map((r) => (
                      <div key={r.id} className="border-b border-border py-3 last:border-b-0">
                        <p className="text-sm font-medium">{r.title}</p>
                        {r.summary ? <p className="mt-1 text-sm text-muted-foreground">{r.summary}</p> : null}
                        {Array.isArray(r.details.lines) && r.details.lines.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {r.details.lines.slice(0, 12).map((line, idx) => (
                              <li key={idx} className={`${MONO} text-xs leading-relaxed text-muted-foreground/90`}>
                                {line}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <p
        className={`${MONO} mt-16 border-t border-border pt-6 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50`}
      >
        Sources: llm-radar · stooq · wttr.in · github · supabase — refreshed on sign-in and on demand
      </p>
    </div>
  );
}