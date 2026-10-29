export const RADAR_TAGS = new Set([
  "local-llm", "agents", "models", "devtools", "security", "selfhosting",
  "danish-tech", "web", "research", "other",
]);

const ITEM_KEYS = ["title", "url", "source", "summary", "tag", "score", "kind", "ts"] as const;
const RADAR_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

type RadarItem = {
  title: string;
  url: string;
  source: string;
  summary: string;
  tag: string;
  score: number;
  kind: string;
  ts: number;
};

export type RadarEdition = { generated: string; count_scanned: number; items: RadarItem[] };

export function isRadarEdition(value: unknown): value is RadarEdition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const edition = value as Record<string, unknown>;
  if (Object.keys(edition).sort().join(",") !== "count_scanned,generated,items") return false;
  if (typeof edition.generated !== "string" || !RADAR_TIMESTAMP.test(edition.generated) || !Number.isFinite(Date.parse(edition.generated))) return false;
  if (!Number.isSafeInteger(edition.count_scanned) || Number(edition.count_scanned) < 0) return false;
  if (!Array.isArray(edition.items) || edition.items.length > 40) return false;
  return edition.items.every((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    if (Object.keys(row).sort().join(",") !== [...ITEM_KEYS].sort().join(",")) return false;
    return typeof row.title === "string" && row.title.length > 0 && row.title.length <= 200
      && typeof row.url === "string" && row.url.length <= 2048 && /^https?:\/\/\S+$/.test(row.url)
      && typeof row.source === "string" && row.source.length > 0 && row.source.length <= 200
      && typeof row.summary === "string" && row.summary.length > 0 && row.summary.length <= 600
      && typeof row.tag === "string" && RADAR_TAGS.has(row.tag)
      && typeof row.score === "number" && Number.isFinite(row.score) && row.score >= 0 && row.score <= 10
      && typeof row.kind === "string" && row.kind.length > 0 && row.kind.length <= 40
      && typeof row.ts === "number" && Number.isFinite(row.ts) && row.ts >= 0;
  });
}

export async function getRadarEdition(): Promise<RadarEdition> {
  const source = process.env.RADAR_PUBLICATION_SOURCE ?? "github";
  if (source === "github") {
    const response = await fetch("https://raw.githubusercontent.com/lucasfth/loki-radar/main/public.json?v=2", {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Radar GitHub feed returned HTTP ${response.status}`);
    const edition: unknown = await response.json();
    if (!isRadarEdition(edition)) throw new Error("Radar GitHub feed returned an invalid public edition");
    return edition;
  }
  if (source !== "supabase") throw new Error(`Unsupported Radar publication source: ${source}`);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error("Radar publication is not configured");
  const request = new Request(`${base.replace(/\/$/, "")}/rest/v1/rpc/get_radar_edition`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(10_000),
  });
  const response = await fetch(request, { next: { revalidate: 1800 } });
  if (!response.ok) throw new Error(`Radar RPC returned HTTP ${response.status}`);
  const edition: unknown = await response.json();
  if (!isRadarEdition(edition)) throw new Error("Radar RPC returned an invalid public edition");
  return edition;
}
