import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

export type VisitorKind = "human" | "agent";

export type StatsOverview = {
  total: number;
  last_1h: number;
  last_7d: number;
  first_visit: string | null;
  hourly_48h: { hour: string; count: number }[];
  top_paths: { name: string; count: number }[];
  top_referrers: { name: string; count: number }[];
  top_regions: { name: string; count: number }[];
  visitor_kinds: Partial<Record<VisitorKind, number>>;
};

const NOT_CONFIGURED = "Portfolio stats are not configured.";

function database() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error(`${NOT_CONFIGURED} Set SUPABASE_URL and SUPABASE_SECRET_KEY.`);
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function isStatsSetupError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(NOT_CONFIGURED);
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function namedPairs(value: unknown, label: "path" | "referrer" | "region"): { name: string; count: number }[] {
  if (!Array.isArray(value)) return [];
  const pairs: { name: string; count: number }[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>)[label] === "string" &&
      typeof (item as Record<string, unknown>).count === "number"
    ) {
      pairs.push({ name: (item as Record<string, string>)[label], count: toNumber((item as { count: unknown }).count) });
    }
  }
  return pairs;
}

function parseKinds(value: unknown): Partial<Record<VisitorKind, number>> {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const kinds: Partial<Record<VisitorKind, number>> = {};
  for (const key of ["human", "agent"] as const) {
    if (typeof record[key] === "number") kinds[key] = toNumber(record[key]);
  }
  return kinds;
}

function parseHourly(value: unknown): { hour: string; count: number }[] {
  if (!Array.isArray(value)) return [];
  const buckets: { hour: string; count: number }[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).hour === "string" &&
      typeof (item as Record<string, unknown>).count === "number"
    ) {
      buckets.push({ hour: (item as { hour: string }).hour, count: toNumber((item as { count: unknown }).count) });
    }
  }
  return buckets;
}

export function emptyOverview(): StatsOverview {
  return {
    total: 0,
    last_1h: 0,
    last_7d: 0,
    first_visit: null,
    hourly_48h: [],
    top_paths: [],
    top_referrers: [],
    top_regions: [],
    visitor_kinds: {},
  };
}

export async function recordVisit(input: {
  path: string;
  referrerDomain: string | null;
  region: string | null;
  visitorKind: VisitorKind;
}): Promise<void> {
  const { error } = await database().rpc("record_visit", {
    p_path: input.path,
    p_referrer_domain: input.referrerDomain ?? "",
    p_region: input.region ?? "",
    p_visitor_kind: input.visitorKind,
  });
  if (error) throw error;
}

export async function fetchStatsOverview(): Promise<StatsOverview> {
  const { data, error } = await database().rpc("stats_overview");
  if (error) throw error;
  const source = (data ?? {}) as Record<string, unknown>;
  return {
    total: toNumber(source.total),
    last_1h: toNumber(source.last_1h),
    last_7d: toNumber(source.last_7d),
    first_visit: typeof source.first_visit === "string" ? source.first_visit : null,
    hourly_48h: parseHourly(source.hourly_48h),
    top_paths: namedPairs(source.top_paths, "path"),
    top_referrers: namedPairs(source.top_referrers, "referrer"),
    top_regions: namedPairs(source.top_regions, "region"),
    visitor_kinds: parseKinds(source.visitor_kinds),
  };
}