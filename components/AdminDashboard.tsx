"use client";

// The /admin overnight module: Supabase email/password sign-in, then a
// control panel that replaces the Telegram morning brief. Live panels
// (radar, stocks, weather, GitHub) fetch through /api/admin/* with the user
// session; the overnight panel reads admin_reports directly with RLS.

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, LogOut, RefreshCw } from "lucide-react";
import { browserSupabase } from "@/lib/admin/browser";
import type {
  AdminReport,
  GithubPayload,
  RadarPayload,
  StockPayload,
  WeatherPayload,
} from "@/lib/admin/types";
import TerminalReveal from "@/components/TerminalReveal";
import AdminGithub from "@/components/AdminGithub";
import { fetchJsonWithRetry } from "@/lib/admin/fetch-json-with-retry.mjs";
import { createRequestCoordinator, githubRefreshErrorFor, payloadRefreshError, reportReadResult, retainSuccessfulPayload } from "@/lib/admin/dashboard-state.mjs";
import { activateDialog, cronJobDetail } from "@/lib/admin/detail-dialog.mjs";

type SessionShape = {
  access_token: string;
  user: { email?: string | null };
} | null;

type FinanceAccount = { name: string; balance: number; source: string; lastSync: string | null; bankStatus: string | null };
type FinancePayload = { schemaVersion: number; currency: string; generatedAt: string; total: number; mixedDates: boolean; simIncluded: boolean; nordea: { balance: number; status: string; accounts: FinanceAccount[]; lastSync: string | null }; saxo: { total: number; investments: number; cash: number; asOf: string; mode: string; liveSync: boolean }; limitations: string[]; estimate?: { total: number; additionalSavings: number; currency: "DKK"; assumptions: string[]; asOf: string }; syncHealth?: { lastAttempt: string | null; lastSuccess: string | null; status: string; reference: string | null } };
type CronJob = { id: string; name: string; kind: "maintenance" | "information"; enabled: boolean; status: string; lastRun: string | null; nextRun: string | null; reference: string | null; referenceType: "session" | "run" | "job" | null; summary: string; details: string | null };
type CronPayload = { generatedAt: string; jobs: CronJob[]; limitations: string[] };

const FINANCE_ENDPOINT = "https://gimle.tail3e4ba0.ts.net/finance/report";
const CRON_ENDPOINT = "https://gimle.tail3e4ba0.ts.net/finance/cron-status";
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


function FieldReveal({ children, loading }: { children: ReactNode; loading: boolean }) {
  return <div className="min-h-[2.5rem]"><TerminalReveal loading={loading} loadingLoop={loading}>{children}</TerminalReveal></div>;
}

function Panel({
  eyebrow, title, meta, state, error, children, className = "", loading = false, ready,
}: {
  eyebrow: string; title?: string; meta?: string | null; state: ModuleState; error?: string | null; children: ReactNode; className?: string; loading?: boolean; ready: boolean;
}) {
  const isLoading = loading || state === "loading";
  const content = Children.toArray(children);
  return <section className={`border border-border bg-background/40 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-3"><div className="flex min-w-0 items-baseline gap-3"><p className={`${MONO} text-[11px] ${TRACK} text-muted-foreground`}>{eyebrow}</p>{title ? <h2 className="truncate text-sm font-medium tracking-tight text-foreground/90">{title}</h2> : null}</div><div className="flex shrink-0 items-center gap-3">{meta ? <span className={`${MONO} text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60`}>{meta}</span> : null}<span className="flex items-center gap-1.5"><Dot state={state} /><span className={`${MONO} text-[10px] ${TRACK} ${state === "ok" ? "text-emerald-400/80" : state === "error" ? "text-rose-400/90" : "text-muted-foreground/60"}`}>{stateWord(state)}</span></span></div></div>
    <div className="px-5 py-5">
      {!ready && state === "loading" ? <div role="status" aria-label={`Loading ${eyebrow} data`} className="space-y-3">{content.map((child, index) => <FieldReveal key={index} loading>{child}</FieldReveal>)}</div>
        : !ready && state === "error" ? <p role="status" className={`${MONO} text-xs ${TRACK} text-muted-foreground`}>Unavailable: {error ?? "source error"}</p>
        : <>{error && ready ? <p role="status" className={`${MONO} mb-4 border border-amber-400/30 px-3 py-2 text-xs text-amber-300`}>Refresh unavailable ({error}); showing last available data.</p> : null}{isLoading && ready ? <p role="status" className={`${MONO} mb-4 text-xs text-muted-foreground`}>Updating; showing last available data.</p> : null}{content}</>}
    </div>
  </section>;
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

async function fetchFinanceReport(token: string, signal?: AbortSignal): Promise<FinancePayload> {
  const result = await fetchJsonWithRetry(FINANCE_ENDPOINT, { cache: "no-store", headers: { Authorization: `Bearer ${token}` }, signal });
  if (!result.response.ok) throw new Error(`HTTP ${result.response.status}`);
  if (!validFinancePayload(result.body)) throw new Error("Unexpected finance report format");
  return result.body;
}

async function refreshFinance(token: string, signal?: AbortSignal): Promise<FinancePayload> {
  const response = await fetch(FINANCE_ENDPOINT.replace("/report", "/refresh"), {
    method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}` }, signal,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!validFinancePayload(payload)) throw new Error("Unexpected finance report format");
  return payload;
}

function AdminDetailDialog({ detail, opener, onClose }: { detail: Record<string, unknown>; opener: HTMLElement | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const dialog = dialogRef.current; if (!dialog) return; return activateDialog({ dialog, opener, body: document.body, onClose }); }, [opener, onClose]);
  const title = String(detail.name ?? detail.title ?? detail.symbol ?? "Details");
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-detail-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-border bg-background p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-6"><h2 id="admin-detail-title" className="text-xl font-medium">{title}</h2><button type="button" data-dialog-close data-dialog-focusable aria-label="Close details" onClick={onClose} className="border border-border px-3 py-2 text-sm">Close</button></div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">{Object.entries(detail).filter(([, value]) => value !== null && value !== undefined && typeof value !== "object").map(([key, value]) => <div key={key} className="border-b border-border pb-3"><dt className={`${MONO} text-[10px] uppercase text-muted-foreground`}>{key.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`)}</dt><dd className="mt-1 break-words text-sm">{String(value)}</dd></div>)}</dl>
      {detail.detailsWithheld ? <p className="mt-5 text-sm text-muted-foreground">Additional details are withheld for safety.</p> : null}
    </div>
  </div>;
}


function CronSidebar({ data, error, openDetail }: { data: CronPayload | null; error: string | null; openDetail: (detail: Record<string, unknown>, opener: HTMLElement) => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showPaused, setShowPaused] = useState(false);
  const visible = (data?.jobs ?? []).filter(job => job.enabled || showPaused);
  async function copy(ref: string) { try { await navigator.clipboard.writeText(ref); setCopied(ref); window.setTimeout(() => setCopied(null), 1600); } catch { setCopied("unavailable"); } }
  return <aside className="border border-border bg-background/40 p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto" aria-label="Scheduled jobs">
    <header className="flex items-baseline justify-between border-b border-border pb-3"><div><p className={`${MONO} text-[10px] ${TRACK} text-muted-foreground`}>Scheduler</p><h2 className="mt-1 text-sm font-medium">Cron status</h2></div><span className={`${MONO} text-[10px] text-muted-foreground`}>{data ? fmtTime(data.generatedAt) : "--:--"}</span></header>
    {error ? <p role="status" className={`${MONO} mt-3 text-xs text-rose-300`}>Status unavailable: {error}{data ? " · showing previous data" : ""}</p> : null}
    {!data && !error ? <div className="mt-4" role="status"><p className={`${MONO} mb-3 text-xs text-muted-foreground`}>Loading</p><TerminalReveal loading><div className="space-y-3"><p className="h-3 w-3/4 bg-foreground/[0.06]">Loading scheduled jobs</p><p className="h-3 w-1/2 bg-foreground/[0.06]">Waiting for schedule status</p><div className="h-24 w-full border border-border bg-foreground/[0.06]" /></div></TerminalReveal></div> : null}
    {data ? <>
      <div className="mt-3 space-y-3">{visible.map(job => {
        const overdue = job.enabled && job.nextRun && new Date(job.nextRun).getTime() < Date.now() && job.status !== "running";
        const running = job.status.toLowerCase() === "running";
        const failed = ["error", "failed", "failure"].includes(job.status.toLowerCase());
        const unknown = !["ok","success","succeeded","idle","paused","disabled","running","overdue","error","failed","failure"].includes(job.status.toLowerCase());
        const label = !job.enabled ? "PAUSED" : running ? "RUNNING" : failed ? "FAILED" : overdue ? "OVERDUE" : unknown ? `UNKNOWN · ${job.status}` : job.status.toUpperCase();
        const tone = failed ? "text-rose-300" : overdue || unknown ? "text-amber-300" : running ? "text-sky-300" : "text-muted-foreground";
        return <div key={job.id} className="border-b border-border pb-3 last:border-0"><button type="button" data-dialog-focusable onClick={event => openDetail(cronJobDetail(job), event.currentTarget)} className="block w-full text-left hover:bg-foreground/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><span className="flex items-start justify-between gap-2"><span className="text-sm">{job.name}</span><span className={`${MONO} shrink-0 text-[9px] ${tone}`}>{label}</span></span><span className={`${MONO} mt-1 block text-[10px] text-muted-foreground`}>{job.kind} · {job.nextRun ? `next ${fmtTime(job.nextRun)}` : "next unknown"}</span>{job.lastRun ? <span className={`${MONO} mt-1 block text-[10px] text-muted-foreground`}>Last run {fmtTime(job.lastRun)}</span> : null}<span className="mt-2 block text-xs text-foreground/80">{job.summary}</span></button>{job.reference ? <button type="button" data-dialog-focusable onClick={() => void copy(job.reference!)} className={`${MONO} mt-2 block max-w-full break-all text-left text-[10px] text-muted-foreground underline`}>{copied === job.reference ? "Copied" : copied === "unavailable" ? "Clipboard unavailable" : `${job.referenceType ?? "reference"}: ${job.reference}`}</button> : null}</div>;
      })}</div>
      {data.limitations.length ? <ul className={`${MONO} mt-3 space-y-1 text-[10px] text-muted-foreground`}>{data.limitations.map((x,i)=><li key={i}>{x}</li>)}</ul> : null}
      <button type="button" onClick={()=>setShowPaused(v=>!v)} className={`${MONO} mt-3 text-[10px] text-muted-foreground underline`}>{showPaused?"Collapse paused jobs":"Show paused jobs"}</button>
    </> : null}
  </aside>;
}

function FinancePanel({ finance, error, refreshing }: { finance: FinancePayload | null; error: string | null; refreshing: boolean }) {
  const state: ModuleState = finance ? "ok" : error ? "error" : "loading";
  return (
    <Panel eyebrow="Finance" title="Daily follow-up" state={state} error={error} meta={finance ? `report ${fmtTime(finance.generatedAt)}` : "private link"} className="lg:col-span-5" ready={Boolean(finance)} loading={refreshing && Boolean(finance)}>
      <div className="grid gap-3 sm:grid-cols-2">
        {[{ label: "Nordea", item: finance ? { total: finance.nordea.balance, source: finance.nordea.status, updated: finance.nordea.lastSync } : null }, { label: "Saxo", item: finance ? { total: finance.saxo.total, source: "Manual statement snapshot", updated: finance.saxo.asOf } : null }].map(({ label, item }) => <div key={label} className="min-h-[7rem] border border-border px-4 py-4"><p className={`${MONO} text-[10px] ${TRACK} text-muted-foreground`}>{label}</p>{item ? <><p className="mt-3 text-lg tabular-nums">{item.total.toLocaleString("en-GB", { style: "currency", currency: finance!.currency })}</p><p className="mt-1 text-sm">{item.source}</p><p className={`${MONO} mt-2 text-[11px] text-muted-foreground`}>Source date: {item.updated ?? "unknown"}</p></> : <p className="mt-3 h-7 w-2/3 text-lg tabular-nums" aria-hidden="true">&nbsp;</p>}</div>)}
      </div>
      <p className={`${MONO} mt-4 min-h-5 text-xs text-muted-foreground`}>Supported subtotal (partial assets): {finance ? `${finance.total.toLocaleString("en-GB", { style: "currency", currency: finance.currency })}. This is not net worth.` : <span aria-hidden="true">&nbsp;</span>}</p>
      {finance ? <>
        {finance.estimate ? <div className="mt-4 border border-border px-4 py-3"><p className={`${MONO} text-[10px] ${TRACK} text-muted-foreground`}>Estimated known assets · historical assumptions · as of {finance.estimate.asOf}</p><p className="mt-2 text-lg tabular-nums">{finance.estimate.total.toLocaleString("en-GB", { style: "currency", currency: finance.estimate.currency })}</p><p className={`${MONO} mt-1 text-xs text-muted-foreground`}>Includes assumed additional savings of {finance.estimate.additionalSavings.toLocaleString("en-GB", { style: "currency", currency: finance.estimate.currency })}; not net worth.</p><ul className={`${MONO} mt-2 space-y-1 text-[11px] text-muted-foreground`}>{finance.estimate.assumptions.map((x,i)=><li key={i}>{x}</li>)}</ul></div> : null}
        {finance.syncHealth ? <p className={`${MONO} mt-3 text-xs text-muted-foreground`}>Bank sync: {finance.syncHealth.status} · last success {finance.syncHealth.lastSuccess ? fmtTime(finance.syncHealth.lastSuccess) : "unknown"}{finance.syncHealth.lastAttempt && finance.syncHealth.status !== "ok" ? ` · last attempt ${fmtTime(finance.syncHealth.lastAttempt)}` : ""}</p> : null}
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
  const [showAll, setShowAll] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<Record<string, unknown> | null>(null);
  const [detailOpener, setDetailOpener] = useState<HTMLElement | null>(null);
  const openDetail = useCallback((detail: Record<string, unknown>, opener: HTMLElement) => { setDetailOpener(opener); setSelectedDetail(detail); }, []);
  const closeDetail = useCallback(() => setSelectedDetail(null), []);
  const hydrated = useRef(false);
  const requests = useRef(createRequestCoordinator());

  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [stocks, setStocks] = useState<StockPayload | null>(null);
  const [github, setGithub] = useState<GithubPayload | null>(null);
  const [radar, setRadar] = useState<RadarPayload | null>(null);
  const [weatherRefreshError, setWeatherRefreshError] = useState<string | null>(null);
  const [stocksRefreshError, setStocksRefreshError] = useState<string | null>(null);
  const [githubRefreshError, setGithubRefreshError] = useState<string | null>(null);
  const [radarRefreshError, setRadarRefreshError] = useState<string | null>(null);
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [finance, setFinance] = useState<FinancePayload | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [financeRefreshError, setFinanceRefreshError] = useState<string | null>(null);
  const [cron, setCron] = useState<CronPayload | null>(null);
  const [cronError, setCronError] = useState<string | null>(null);

  const hasSession = Boolean(session);

  const api = useCallback(
    async (path: string, signal: AbortSignal): Promise<any | null> => {
      if (!session) return null;
      try {
        const result = await fetchJsonWithRetry(path, { signal, headers: { Authorization: `Bearer ${session.access_token}` } });
        const body = result.body as { status?: unknown } | null;
        // Keep GitHub error metadata separate from the retained successful payload.
        if (path === "/api/admin/github" && result.response.ok && body?.status === "error") return result.body;
        return result.response.ok && body?.status === "ok" ? result.body : null;
      } catch {
        return null;
      }
    },
    [session],
  );

  const loadAll = useCallback(async (request = requests.current.begin()) => {
    const { id, signal } = request;
    const sb = browserSupabase();
    const [w, s, g, r] = await Promise.all([
      api("/api/admin/weather", signal),
      api("/api/admin/stocks", signal),
      api("/api/admin/github", signal),
      api("/api/admin/radar", signal),
    ]);
    if (!requests.current.isCurrent(id)) return false;
    setWeather(previous => retainSuccessfulPayload(previous, w)); setWeatherRefreshError(payloadRefreshError(w));
    setStocks(previous => retainSuccessfulPayload(previous, s)); setStocksRefreshError(payloadRefreshError(s));
    setGithub(previous => retainSuccessfulPayload(previous, g)); setGithubRefreshError(githubRefreshErrorFor(g));
    setRadar(previous => retainSuccessfulPayload(previous, r)); setRadarRefreshError(payloadRefreshError(r));
    if (session?.access_token) {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const cronRequest = fetchJsonWithRetry(CRON_ENDPOINT, { cache: "no-store", headers, signal }).then(({ response, body }) => { if (!requests.current.isCurrent(id)) return; if (!response.ok) throw new Error(`HTTP ${response.status}`); const value = body as CronPayload; if (!value || typeof value.generatedAt !== "string" || !Array.isArray(value.jobs) || !Array.isArray(value.limitations) || !value.limitations.every(x => typeof x === "string") || !value.jobs.every(job => job && typeof job.id === "string" && typeof job.name === "string" && typeof job.status === "string" && typeof job.enabled === "boolean" && ["maintenance", "information"].includes(job.kind) && typeof job.summary === "string" && [job.lastRun, job.nextRun, job.reference, job.details].every(x => x === null || typeof x === "string") && [null, "session", "run", "job"].includes(job.referenceType))) throw new Error("Unexpected cron status format"); setCron(value); setCronError(null); }).catch(error => { if (requests.current.isCurrent(id)) setCronError(error instanceof Error ? error.message : "Cron status unavailable"); });
      const financeRequest = fetchFinanceReport(session.access_token, signal).then(report => { if (requests.current.isCurrent(id)) { setFinance(report); setFinanceError(null); } }).catch(error => { if (requests.current.isCurrent(id)) setFinanceError(error instanceof Error ? error.message : "Finance endpoint unavailable"); });
      await Promise.all([cronRequest, financeRequest]);
    }
    if (sb && requests.current.isCurrent(id)) {
      try {
        const { data, error } = await sb.from("admin_reports").select("*").order("created_at", { ascending: false }).limit(120);
        if (!requests.current.isCurrent(id)) return false;
        const result = reportReadResult(reports, { data: !error && Array.isArray(data) ? (data as AdminReport[]).map(r => ({ ...r, details: r.details && typeof r.details === "object" ? r.details : {} })) : null, error });
        setReports(result.reports);
        setReportsError(result.error);
      } catch {
        if (!requests.current.isCurrent(id)) return false;
        const result = reportReadResult(reports, { data: null, error: true });
        setReports(result.reports);
        setReportsError(result.error);
      }
    }
    return requests.current.isCurrent(id);
  }, [api, session?.access_token, reports]);

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
      requests.current.cancel();
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
    void loadAll().then(current => { if (current) setLastSync(cphNow()); }).catch(() => undefined);
  }, [hasSession, loadAll]);

  const refresh = async () => {
    if (refreshing) return;
    const { id, signal } = requests.current.begin();
    setRefreshing(true);
    try {
      if (session?.access_token) {
        try { const report = await refreshFinance(session.access_token, signal); if (requests.current.isCurrent(id)) { setFinance(report); setFinanceError(null); setFinanceRefreshError(null); } }
        catch (error) { if (requests.current.isCurrent(id)) setFinanceRefreshError(error instanceof Error ? error.message : "Finance refresh failed"); }
      }
      const current = await loadAll({ id, signal });
      if (current) setLastSync(cphNow());
    } finally {
      setRefreshing(false);
    }
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
    requests.current.cancel();
    hydrated.current = false;
    setRefreshing(false);
    const sb = browserSupabase();
    await sb?.auth.signOut();
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

  const ws = weatherRefreshError ? "error" : statusState(weather);
  const ss = stocksRefreshError ? "error" : statusState(stocks);
  const gs = githubRefreshError ? "error" : statusState(github);
  const rs = radarRefreshError ? "error" : statusState(radar);
  const os: ModuleState = reportsError ? "error" : reports === null ? "loading" : "ok";

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
      sub: "llm-radar, daily",
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
        gs === "ok" ? `${github!.coverage === "complete" ? "" : "at least "}${github!.openPulls.length} PRs for lucasfth` : gs === "error" ? "gh fault" : "syncing",
      sub: "github, current open PRs",
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
        <FinancePanel finance={finance} error={financeRefreshError ?? financeError} refreshing={refreshing} />
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="order-2 space-y-10 lg:order-1 lg:col-span-9">
        <Panel
          eyebrow="Radar"
          title="Signal feed"
          state={rs}
          error={radarRefreshError ?? radar?.message}
          meta={radar?.generated ? `updated ${fmtTime(radar.generated)}` : "compiled daily"}
          className="lg:col-span-5"
          loading={refreshing && Boolean(radar)}
          ready={Boolean(radar)}
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
          error={stocksRefreshError ?? stocks?.message}
          meta={stocks?.asOf ? `as of ${fmtTime(stocks.asOf)}` : "stooq"}
          className="lg:col-span-3"
          loading={refreshing && Boolean(stocks)}
          ready={Boolean(stocks)}
        >
          <div
            className={`${MONO} mb-2 flex items-baseline justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50`}
          >
            <span>Symbol</span>
            <span className="flex-1 px-3 text-right">Trend</span>
            <span>Last / Chg</span>
          </div>
          <ul>
            {(stocks && stocks.status === "ok" ? (showAll ? stocks.stocks : stocks.stocks.slice(0, 6)) : []).map((s) => {
              const up = s.changePct >= 0;
              const isTop = topMover?.symbol === s.symbol;
              return (
                <li key={s.symbol} className="border-b border-border last:border-b-0">
                  <button type="button" data-dialog-focusable onClick={event => openDetail({ ...s, title: `${s.symbol} — ${s.name}` }, event.currentTarget)} className="flex w-full items-center gap-4 py-3 text-left hover:bg-foreground/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                    <div className="min-w-0 flex-1"><p className={`${MONO} text-xs uppercase tracking-[0.1em]`}>{s.symbol}{isTop ? <span className={`${MONO} ml-2 border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80`}>Top</span> : null}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{s.name}</p></div><Sparkline values={s.closes} up={up} />
                    <div className="w-32 shrink-0 text-right"><span className="text-sm tabular-nums">{s.price.toFixed(2)}<span className={`${MONO} ml-1 text-[11px] text-muted-foreground/70`}>{s.currency}</span></span><span className="ml-2 align-middle">{changeCell(s.changePct)}</span></div>
                  </button>
                </li>
              );
            })}
          </ul>
          {stocks && stocks.stocks.length > 6 ? <button type="button" onClick={() => setShowAll(v => !v)} className={`${MONO} mt-3 text-[10px] text-muted-foreground underline`}>{showAll ? "Show fewer" : `Show all ${stocks.stocks.length} symbols`}</button> : null}
        </Panel>

        <Panel
          eyebrow="Env"
          title="Copenhagen"
          state={ws}
          error={weatherRefreshError ?? weather?.message}
          meta={weather?.updated ? `as of ${fmtTime(weather.updated)}` : "wttr.in"}
          className="lg:col-span-2"
          loading={refreshing && Boolean(weather)}
          ready={Boolean(weather)}
        >
          {weather && weather.status === "ok" && weather.current ? (
            <>
              <button type="button" data-dialog-focusable onClick={event => openDetail({ title: "Copenhagen weather", "Feels like": weather.current!.feels, Wind: weather.current!.wind, Rain: weather.current!.precip, Range: `${weather.today?.mint ?? "--"}–${weather.today?.max ?? "--"}°C`, UV: weather.today?.uv ?? "unknown", Sun: `${weather.today?.sunrise ?? "unknown"}–${weather.today?.sunset ?? "unknown"}`, Description: weather.current!.desc, Temperature: `${weather.current!.temp}°C`, Bike: weather.current!.bike ? "OK" : "NO", Waterproof: weather.current!.waterproof ? "OK" : "NO" }, event.currentTarget)} className="block min-h-[7rem] w-full text-left hover:bg-foreground/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                <p className="text-5xl font-light tabular-nums tracking-tight">{weather.current.temp.toFixed(0)}<span className="ml-1 text-2xl text-muted-foreground">°C</span></p>
                <p className="mt-1 text-sm text-muted-foreground">{weather.current.desc}</p><div className="mt-4 flex flex-wrap gap-2"><Chip label="Bike" on={weather.current.bike} /><Chip label="Waterproof" on={weather.current.waterproof} /></div>
              </button>
            </>
          ) : null}
        </Panel>

        <Panel
          eyebrow="GitHub"
          title="Repositories and activity"
          state={gs}
          error={githubRefreshError ?? (github?.status === "error" ? github.message : undefined)}
          meta={github ? `${github.coverage === "complete" ? "" : "at least "}${github.openPulls.length} PRs for lucasfth` : "-- PRs"}
          className="lg:col-span-5"
          loading={refreshing && Boolean(github)}
          ready={github?.status === "ok"}
        >
          {github && github.status === "ok" ? (
            <AdminGithub payload={github} />
          ) : null}
        </Panel>

        <Panel
          eyebrow="Overnight"
          title={latestNight ? `Night of ${nightLabel}` : "No reports yet"}
          state={os}
          error={reportsError}
          meta={reports === null ? null : `${tonight.length} reports tonight`}
          className="lg:col-span-5"
          ready={reports !== null}
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
        <div className="order-1 lg:order-2 lg:col-span-3"><CronSidebar data={cron} error={cronError} openDetail={openDetail} /></div>
      </div>

      <p
        className={`${MONO} mt-16 border-t border-border pt-6 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50`}
      >
        Sources: llm-radar · stooq · wttr.in · github · supabase — refreshed on sign-in and on demand
      </p>
      {selectedDetail ? <AdminDetailDialog detail={selectedDetail} opener={detailOpener} onClose={closeDetail} /> : null}
    </div>
  );
}