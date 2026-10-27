import "server-only";

// Server-side data sources for the /admin overnight module.
//
// Every fetcher is bounded (timeouts, caps, per-symbol try/catch), returns a
// plain JSON payload, and degrades per-panel: one failed source never takes
// the whole page down. Results are cached in-module for 2 minutes to keep
// upstream call volume personal-scale.

type CacheEntry = { at: number; value: unknown };
const cache = new Map<string, CacheEntry>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function getJson(url: string, timeoutMs = 10000, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (lucashanson.dk admin)", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}

const GITHUB_TOKEN = process.env.GITHUB_ADMIN_TOKEN ?? "";
const GH_HEADERS: Record<string, string> = GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {};
const GITHUB_WINDOW_HOURS = 24;

// The watchlist mirrors the morning briefing (life/004-Stock-Watchlist.md).
// Cap each symbol's uncertainty: the admin overview, not a trading terminal.
const STOCK_WATCHLIST: [symbol: string, name: string][] = [
  ["SPVIGAKL.CO", "SPVIGAKL"],
  ["NOVO-B.CO", "Novo Nordisk"],
  ["DSV.CO", "DSV"],
  ["NNXPF", "NanoExplore"],
  ["NVDA", "NVIDIA"],
  ["ORSTED.CO", "Ørsted"],
  ["TSLA", "TSLA"],
  ["QCOM", "Qualcomm"],
  ["MSFT", "Microsoft"],
];

export async function fetchWeather() {
  try {
    const data = await cached("weather", 60_000, () => getJson("https://wttr.in/Hellerup?format=j1"));
    const current = data?.current_condition?.[0];
    const today = data?.weather?.[0];
    if (!current || !today) throw new Error("unexpected wttr.in shape");
    const temp = Number(current.temp_C);
    const wind = Number(current.windspeedKmph);
    const precip = Number(current.precipMM ?? 0);
    const hourly: any[] = Array.isArray(today.hourly) ? today.hourly : [];
    const precipHours = hourly.filter((h) => Number(h.precipMM ?? 0) > 0).length;
    return {
      status: "ok",
      updated: new Date().toISOString(),
      current: {
        desc: current.weatherDesc?.[0]?.value ?? "Unknown",
        temp,
        feels: Number(current.FeelsLikeC),
        wind,
        precip,
        // Same rule as the morning briefing: ride above 5C, under 25 km/h,
        // when it is not raining right now.
        bike: temp > 5 && wind < 25 && precip === 0,
        waterproof: wind > 20 || precip > 0,
      },
      today: {
        mint: Number(today.mintempC),
        max: Number(today.maxtempC),
        uv: Number(today.uvIndex ?? 0),
        sunrise: today.astronomy?.[0]?.sunrise ?? "",
        sunset: today.astronomy?.[0]?.sunset ?? "",
        precipHours,
      },
    };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "weather fetch failed", current: undefined, today: undefined };
  }
}

export async function fetchStocks() {
  const results = await Promise.allSettled(
    STOCK_WATCHLIST.map(async ([symbol, name]) => {
      const data = await getJson(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
        6000,
      );
      const result = data?.chart?.result?.[0];
      const meta = result?.meta ?? {};
      const price = meta.regularMarketPrice;
      const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? [])
        .filter((c: unknown) => typeof c === "number" && Number.isFinite(c))
        .map(Number);
      const prevClose = closes.length >= 2 ? closes[closes.length - 2] : null;
      if (typeof price !== "number" || !prevClose || prevClose <= 0) throw new Error("no price");
      return {
        symbol,
        name,
        price,
        prevClose,
        changePct: ((price - prevClose) / prevClose) * 100,
        currency: typeof meta.currency === "string" ? meta.currency : "",
        closes: closes.slice(-5).map((c) => Math.round(c * 100) / 100),
        at: new Date(meta.regularMarketTime ?? Date.now() / 1000).toISOString(),
      };
    }),
  );
  const stocks = results
    .filter((r): r is PromiseFulfilledResult<typeof STOCK_WATCHLIST[number]> & { value: any } => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  if (stocks.length === 0) {
    return { status: "error", message: "all stock fetches failed", asOf: new Date().toISOString(), stocks: [] };
  }
  return { status: "ok", asOf: new Date().toISOString(), stocks };
}

async function githubRepos(owner: string, limit = 12): Promise<{ repos: any[]; failed: boolean }> {
  const url =
    owner === "lucasfth"
      ? `https://api.github.com/users/${owner}/repos?per_page=100&sort=pushed&direction=desc`
      : `https://api.github.com/orgs/${owner}/repos?per_page=60&sort=pushed&direction=desc`;
  try {
    const repos = await getJson(url, 10000, GH_HEADERS);
    if (!Array.isArray(repos)) return { repos: [], failed: false };
    return { repos: repos.filter((r) => r && typeof r.full_name === "string").slice(0, limit), failed: false };
  } catch {
    return { repos: [], failed: true };
  }
}

export async function fetchGithub() {
  try {
    const since = new Date(Date.now() - GITHUB_WINDOW_HOURS * 3600_000).toISOString();
    const [personalR, orgR] = await Promise.all([githubRepos("lucasfth", 12), githubRepos("EcoRayDev", 12)]);
    // Both repo-list fetches failing means GitHub is unreachable (or the
    // token is wrong); a single failure still yields partial coverage.
    if (personalR.failed && orgR.failed) {
      return {
        status: "error",
        message: "GitHub unreachable (repo list failed)",
        windowHours: GITHUB_WINDOW_HOURS,
        commits: [],
        openPulls: [],
        issues: [],
      };
    }
    const personal = personalR.repos;
    const org = orgR.repos.filter((r) => !personal.some((p) => p.full_name === r.full_name));
    const repos = [...personal, ...org].slice(0, 20);

    const [commitResults, pullResults, issueResults] = await Promise.all([
      Promise.allSettled(
        repos.map(async (repo) => {
          const commits = await getJson(
            `https://api.github.com/repos/${repo.full_name}/commits?since=${since}&per_page=6`,
            8000,
            GH_HEADERS,
          );
          return Array.isArray(commits)
            ? commits.map((c: any) => ({
                repo: repo.full_name,
                sha: c.sha?.slice(0, 7) ?? "",
                message: String(c.commit?.message ?? "").split("\n")[0].slice(0, 120),
                author: c.commit?.author?.name ?? c.author?.login ?? "",
                url: c.html_url ?? `https://github.com/${repo.full_name}/commit/${c.sha}`,
                committed: c.commit?.committer?.date ?? c.commit?.author?.date ?? "",
              }))
            : [];
        }),
      ),
      Promise.allSettled(
        repos.map(async (repo) => {
          const pulls = await getJson(
            `https://api.github.com/repos/${repo.full_name}/pulls?state=open&per_page=4`,
            8000,
            GH_HEADERS,
          );
          return Array.isArray(pulls)
            ? pulls
                .filter((p: any) => p.user?.login === "lucasfth" || p.draft === false)
                .slice(0, 3)
                .map((p: any) => ({
                  repo: repo.full_name,
                  number: p.number,
                  title: String(p.title ?? "").slice(0, 120),
                  state: p.state,
                  url: p.html_url ?? `https://github.com/${repo.full_name}/pull/${p.number}`,
                }))
            : [];
        }),
      ),
      Promise.allSettled(
        personal.map(async (repo) => {
          const issues = await getJson(
            `https://api.github.com/repos/${repo.full_name}/issues?since=${since}&state=all&per_page=6`,
            8000,
            GH_HEADERS,
          );
          return Array.isArray(issues)
            ? issues
                .filter((i: any) => !i.pull_request && i.user?.login === "lucasfth")
                .slice(0, 3)
                .map((i: any) => ({
                  repo: repo.full_name,
                  number: i.number,
                  title: String(i.title ?? "").slice(0, 120),
                  state: i.state,
                  url: i.html_url ?? `https://github.com/${repo.full_name}/issues/${i.number}`,
                }))
            : [];
        }),
      ),
    ]);

    const commits = commitResults
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .filter((c) => c.sha)
      .slice(0, 25);
    const openPulls = pullResults
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .slice(0, 12);
    const issues = issueResults
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .slice(0, 8);

    // Per-repo calls are isolated; if every one rejected, that is a source
    // failure masquerading as a quiet day (review finding F2).
    const attempted = repos.length + repos.length + personal.length;
    const failed =
      commitResults.filter((r) => r.status === "rejected").length +
      pullResults.filter((r) => r.status === "rejected").length +
      issueResults.filter((r) => r.status === "rejected").length;
    if (attempted > 0 && failed === attempted) {
      return {
        status: "error",
        message: "GitHub source calls failed",
        windowHours: GITHUB_WINDOW_HOURS,
        commits: [],
        openPulls: [],
        issues: [],
      };
    }
    return { status: "ok", windowHours: GITHUB_WINDOW_HOURS, commits, openPulls, issues };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "github fetch failed",
      windowHours: GITHUB_WINDOW_HOURS,
      commits: [],
      openPulls: [],
      issues: [],
    };
  }
}

export async function fetchRadar() {
  try {
    const data = await cached("radar", 1800_000, () =>
      getJson("https://raw.githubusercontent.com/lucasfth/loki-radar/main/public.json?v=2", 10000),
    );
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    const top = items
      .filter((i) => typeof i?.url === "string" && i.url.startsWith("http"))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 12)
      .map((i) => ({
        title: String(i.title ?? "").slice(0, 160),
        url: i.url,
        source: String(i.source ?? ""),
        summary: String(i.summary ?? "").slice(0, 240),
        tag: String(i.tag ?? "other"),
        score: Number(i.score ?? 0),
        kind: String(i.kind ?? ""),
        ts: Number(i.ts ?? 0),
      }));
    return {
      status: "ok",
      generated: typeof data?.generated === "string" ? data.generated : undefined,
      countScanned: typeof data?.count_scanned === "number" ? data.count_scanned : undefined,
      items: top,
    };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "radar fetch failed", items: [] };
  }
}