import { NextRequest } from "next/server";
import { isStatsSetupError, recordVisit } from "@/lib/stats/store";

export const runtime = "nodejs";

// Substrings that mark a user agent as non-human: LLM scrapers first, then
// search engines and common crawling tooling. Kept conservative.
const AGENT_MARKERS = [
  "gptbot",
  "chatgpt",
  "openai",
  "oai-searchbot",
  "claude",
  "anthropic",
  "perplexity",
  "cohere",
  "ccbot",
  "google-extended",
  "applebot",
  "bingbot",
  "yandexbot",
  "duckduckbot",
  "facebot",
  "linkedinbot",
  "twitterbot",
  "telegrambot",
  "whatsapp",
  "semrush",
  "ahrefs",
  "seobots",
  "megaindex",
  "baiduspider",
  "bytespider",
  "amazon",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "node-fetch",
  "axios",
  "okhttp",
];

function isAgent(request: NextRequest): boolean {
  const userAgent = (request.headers.get("user-agent") ?? "").toLowerCase();
  return AGENT_MARKERS.some((marker) => userAgent.includes(marker));
}

function sanitizePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 1 || value.length > 200) return null;
  return /^\/[a-zA-Z0-9[/\-._?%=&#()~+]*/u.test(value) ? value : null;
}

function referrerDomain(request: NextRequest): string | null {
  const raw = request.headers.get("referer");
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    if (host.length < 4 || host.length > 200) return null;
    if (host === "lucashanson.dk" || host.endsWith(".lucashanson.dk")) return null;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(host) ? host : null;
  } catch {
    return null;
  }
}

function sanitizeRegion(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z][A-Za-z'-]{1,39}$/.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text && text.length <= 1024) {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed beacon payloads are dropped, not surfaced to the visitor.
  }

  const path = sanitizePath(body.path);
  if (!path) return new Response(null, { status: 204 });

  try {
    await recordVisit({
      path,
      referrerDomain: referrerDomain(request),
      region: sanitizeRegion(body.region),
      visitorKind: isAgent(request) ? "agent" : "human",
    });
  } catch (error) {
    const detail = isStatsSetupError(error) ? "stats_unconfigured" : "stats_unavailable";
    return new Response(detail, { status: 503 });
  }
  return new Response(null, { status: 204 });
}