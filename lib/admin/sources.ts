import "server-only";
import { getRadarEdition } from "@/lib/radar/publication";

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

import { collectGithub, createGithubCache } from "./github.mjs";

const GITHUB_TOKEN = process.env.GITHUB_ADMIN_TOKEN ?? "";

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
  let category = "transport";
  try {
    const data = await cached("weather", 60_000, async () => {
      const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=55.6761&longitude=12.5683&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset,precipitation_hours&timezone=Europe%2FCopenhagen&forecast_days=1&wind_speed_unit=kmh&temperature_unit=celsius&precipitation_unit=mm&timeformat=unixtime", {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 (lucashanson.dk admin)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) { category = "provider-http"; throw new Error("Weather HTTP failure"); }
      category = "provider-shape";
      const body = await response.json();
      const current = body?.current, daily = body?.daily;
      const numeric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
      const shapeError = () => { throw new Error("Weather shape failure"); };
      if (!current || !daily || body.timezone !== "Europe/Copenhagen") shapeError();
      for (const [field, unit] of Object.entries({time:"unixtime",interval:"seconds",temperature_2m:"°C",apparent_temperature:"°C",precipitation:"mm",weather_code:"wmo code",wind_speed_10m:"km/h"})) {
        if (body.current_units?.[field] !== unit || !numeric(current[field])) shapeError();
      }
      const day = (field: string, unit: string) => {
        if (body.daily_units?.[field] !== unit || !Array.isArray(daily[field]) || daily[field].length !== 1 || !numeric(daily[field][0])) shapeError();
        return daily[field][0] as number;
      };
      const localDate = (seconds: number) => new Intl.DateTimeFormat("en-CA", {timeZone:"Europe/Copenhagen",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(seconds*1000));
      const localTime = (seconds: number) => new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Copenhagen",hour:"2-digit",minute:"2-digit"}).format(new Date(seconds*1000));
      const forecastDate = localDate(day("time", "unixtime"));
      const mint = day("temperature_2m_min", "°C"), max = day("temperature_2m_max", "°C"), uv = day("uv_index_max", "");
      const sunrise = day("sunrise", "unixtime"), sunset = day("sunset", "unixtime"), precipHours = day("precipitation_hours", "h");
      if (current.precipitation < 0 || current.wind_speed_10m < 0 || !Number.isInteger(current.weather_code) || current.interval <= 0 || current.interval > 3600 || mint > max || uv < 0 || precipHours < 0 || precipHours > 24 || sunrise >= sunset || localDate(sunrise) !== forecastDate || localDate(sunset) !== forecastDate) shapeError();
      const descriptions: Record<number,string> = {0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",56:"Light freezing drizzle",57:"Freezing drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",66:"Light freezing rain",67:"Freezing rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Light showers",81:"Showers",82:"Heavy showers",85:"Light snow showers",86:"Snow showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Thunderstorm with heavy hail"};
      const temp = current.temperature_2m, wind = current.wind_speed_10m, precip = current.precipitation;
      // Convert every consumed field before inserting a successful cache entry.
      const updated = new Date(current.time*1000).toISOString();
      if (Date.now()-Date.parse(updated) > 3600_000 || Date.parse(updated)-Date.now() > 900_000 || localDate(Date.now()/1000) !== forecastDate) shapeError();
      return {
        updated, forecastDate, source: "Open-Meteo", freshness: "Model-based conditions · not a station observation",
        current: {desc:descriptions[current.weather_code] ?? "Unknown",temp,feels:current.apparent_temperature,wind,precip,bike:temp>5 && wind<25 && precip===0,waterproof:wind>20 || precip>0},
        today: {mint,max,uv,sunrise:localTime(sunrise),sunset:localTime(sunset),precipHours},
      };
    });
    if (Date.now()-Date.parse(data.updated) > 3600_000 || data.forecastDate !== new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Copenhagen",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(Date.now()))) {
      cache.delete("weather"); category = "provider-shape"; throw new Error("Expired model data");
    }
    return { status: "ok", ...data };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") category = "timeout";
    // Never send provider messages, URLs or response bodies to the client.
    return { status: "error", category, current: undefined, today: undefined };
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

export const fetchGithub = createGithubCache(() => collectGithub({
    scope: process.env.GITHUB_ADMIN_SCOPE === "personal" ? "personal" : "all",
    request: async (path, body, signal) => {
      const response = await fetch(`https://api.github.com${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "lucashanson.dk admin",
          ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
        cache: "no-store",
      });
      if (!response.ok) {
        throw Object.assign(new Error("GitHub source unavailable"), {
          status: response.status,
          rateLimited: response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after"),
        });
      }
      return response.json();
    },
}));

export async function fetchRadar() {
  try {
    const data = await cached("radar", 1800_000, getRadarEdition);
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