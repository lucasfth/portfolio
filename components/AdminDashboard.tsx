"use client";

// The /admin overnight module: Supabase email/password sign-in, then panels
// that replace the Telegram morning brief. Live panels (radar, stocks,
// weather, GitHub) fetch through /api/admin/* with the user session; the
// overnight panel reads admin_reports directly with RLS.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, LogOut } from "lucide-react";
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

type Phase = "boot" | "anon" | "auth" | "cfg";

function cphNow(): string {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function changeCell(pct: number) {
  if (!Number.isFinite(pct)) return <span className="text-muted-foreground">--</span>;
  const up = pct >= 0;
  return (
    <span className={up ? "text-emerald-400/90" : "text-rose-400/90"}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Panel({
  eyebrow,
  title,
  children,
  error,
  loading,
  className = "",
}: {
  eyebrow: string;
  title?: string;
  children: ReactNode;
  error?: string | null;
  loading?: boolean;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>
          {title ? <h2 className="mt-1 text-lg font-medium tracking-tight">{title}</h2> : null}
        </div>
      </div>
      {loading ? (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">Loading</p>
      ) : error ? (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">Unavailable: {error}</p>
      ) : (
        children
      )}
    </section>
  );
}

export default function AdminDashboard() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [session, setSession] = useState<SessionShape>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState("");
  const hydrated = useRef(false);

  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [stocks, setStocks] = useState<StockPayload | null>(null);
  const [github, setGithub] = useState<GithubPayload | null>(null);
  const [radar, setRadar] = useState<RadarPayload | null>(null);
  const [reports, setReports] = useState<AdminReport[] | null>(null);

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

  // Clock.
  useEffect(() => {
    const tick = () => setClock(cphNow());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Panel fetches, once per sign-in.
  useEffect(() => {
    if (!hasSession || !hydrated.current) return;
    hydrated.current = true;
    api("/api/admin/weather").then(setWeather);
    api("/api/admin/stocks").then(setStocks);
    api("/api/admin/github").then(setGithub);
    api("/api/admin/radar").then(setRadar);
    const sb = browserSupabase();
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
  }, [hasSession, api]);

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
      <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-32 sm:pt-40">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">Loading</p>
      </div>
    );
  }

  if (phase === "cfg") {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-32 sm:pt-40">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Admin module not configured (Supabase env missing).
        </p>
      </div>
    );
  }

  if (phase === "anon") {
    return (
      <div className="mx-auto w-full max-w-sm px-6 pb-24 pt-32 sm:pt-40">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The overnight overview: radar, stocks, weather, GitHub and what ran while you slept.
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
            className="w-full border border-foreground bg-foreground py-3 font-mono text-xs uppercase tracking-[0.18em] transition-opacity disabled:opacity-50"
          >
            {busy ? "Signing in" : "Sign in"}
          </button>
          {signInError ? <p className="text-xs text-rose-400/90">{signInError}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={resetPassword}
            className="w-full border border-border py-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Forgot password
          </button>
        </form>
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

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-32 sm:pt-40">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">Overnight</h1>
        </div>
        <div className="flex items-center gap-6">
          <p className="font-mono text-xs text-muted-foreground">{clock} Copenhagen</p>
          <p className="hidden font-mono text-xs text-muted-foreground sm:block">{session?.user?.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
        <Panel eyebrow="Radar" className="md:col-span-2" loading={!radar} error={radar?.status === "error" ? radar.message : null}>
          {radar && radar.status === "ok" ? (
            <>
              <p className="mb-6 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                {radar.generated
                  ? `Updated ${new Date(radar.generated).toLocaleString("en-GB", { timeZone: "Europe/Copenhagen", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} Copenhagen time`
                  : "Compiled twice daily"}
              </p>
              <ul>
                {radar.items.map((item) => (
                  <li key={item.url} className="border-b border-border">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-baseline justify-between gap-6 py-4 transition-colors duration-300 hover:bg-foreground/[0.03]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium">{item.title}</span>
                        <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                          {item.tag} / {item.source}
                        </span>
                      </span>
                      <ArrowUpRight size={16} className="shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  </li>
                ))}
              </ul>
              <a
                href="/radar"
                className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Open the full radar <ArrowUpRight size={14} />
              </a>
            </>
          ) : null}
        </Panel>

        <Panel eyebrow="Stocks" title="Watchlist" loading={!stocks} error={stocks?.status === "error" ? stocks.message : null}>
          {stocks && stocks.status === "ok" ? (
            <ul>
              {stocks.stocks.map((s) => (
                <li key={s.symbol} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground/70">{s.symbol}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm tabular-nums">
                      {s.price.toFixed(2)}
                      <span className="ml-1 font-mono text-[11px] text-muted-foreground">{s.currency}</span>
                    </span>
                    <span className="font-mono text-xs tabular-nums">{changeCell(s.changePct)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel eyebrow="Weather" title="Hellerup" loading={!weather} error={weather?.status === "error" ? weather.message : null}>
          {weather && weather.status === "ok" && weather.current ? (
            <div>
              <p className="text-xl font-medium tracking-tight">{weather.current.desc}</p>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {weather.current.temp.toFixed(0)}C, feels {weather.current.feels.toFixed(0)}C
                {" · "}wind {weather.current.wind.toFixed(0)} km/h
              </p>
              {weather.today ? (
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground/80">
                  {weather.today.mint.toFixed(0)}C to {weather.today.max.toFixed(0)}C · sunrise {weather.today.sunrise} · sunset {weather.today.sunset}
                </p>
              ) : null}
              <div className="mt-4 flex gap-6 font-mono text-xs uppercase tracking-[0.18em]">
                <span className={weather.current.bike ? "text-foreground" : "text-muted-foreground/60"}>
                  Bike: {weather.current.bike ? "Yes" : "No"}
                </span>
                <span className={weather.current.waterproof ? "text-foreground" : "text-muted-foreground/60"}>
                  Waterproof: {weather.current.waterproof ? "Yes" : "No"}
                </span>
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel eyebrow="GitHub" title="Last 24 hours" className="md:col-span-2" loading={!github} error={github?.status === "error" ? github.message : null}>
          {github && github.status === "ok" ? (
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Commits</p>
                {github.commits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Quiet day.</p>
                ) : (
                  <ul>
                    {github.commits.slice(0, 10).map((c) => (
                      <li key={c.repo + c.sha} className="border-b border-border">
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="block py-2.5 transition-colors hover:bg-foreground/[0.03]">
                          <span className="block truncate text-sm">{c.message}</span>
                          <span className="font-mono text-[11px] text-muted-foreground/70">
                            {c.repo} · {c.author}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Open pull requests</p>
                {github.openPulls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None open.</p>
                ) : (
                  <ul>
                    {github.openPulls.map((p) => (
                      <li key={p.repo + p.number} className="border-b border-border">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="block py-2.5 transition-colors hover:bg-foreground/[0.03]">
                          <span className="block truncate text-sm">{p.title}</span>
                          <span className="font-mono text-[11px] text-muted-foreground/70">
                            {p.repo} · #{p.number}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Issues touched</p>
                {github.issues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing new.</p>
                ) : (
                  <ul>
                    {github.issues.map((i) => (
                      <li key={i.repo + i.number} className="border-b border-border">
                        <a href={i.url} target="_blank" rel="noopener noreferrer" className="block py-2.5 transition-colors hover:bg-foreground/[0.03]">
                          <span className="block truncate text-sm">{i.title}</span>
                          <span className="font-mono text-[11px] text-muted-foreground/70">
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

        <Panel eyebrow="Overnight" title={latestNight ? `Night of ${latestNight}` : "No reports yet"} className="md:col-span-2" loading={reports === null}>
          {reports !== null ? (
            tonight.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing ran yet. Reports land automatically from the overnight jobs.</p>
            ) : (
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                {reportKinds.map(({ kind, label }) => {
                  const rows = reportsByKind.get(kind) ?? [];
                  if (rows.length === 0) return null;
                  return (
                    <div key={kind}>
                      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
                      {rows.map((r) => (
                        <div key={r.id} className="border-b border-border py-3">
                          <p className="text-sm font-medium">{r.title}</p>
                          {r.summary ? <p className="mt-1 text-sm text-muted-foreground">{r.summary}</p> : null}
                          {Array.isArray(r.details.lines) && r.details.lines.length > 0 ? (
                            <ul className="mt-2 space-y-1">
                              {r.details.lines.slice(0, 12).map((line, idx) => (
                                <li key={idx} className="font-mono text-xs leading-relaxed text-muted-foreground/90">
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
            )
          ) : null}
        </Panel>
      </div>
    </div>
  );
}