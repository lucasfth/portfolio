import { createHash, timingSafeEqual } from "node:crypto";
import { HOST_IDS, validateReport, type HostId, type FleetReport } from "./fleet.ts";
export type ProducerTokens = Partial<Record<HostId, string>>;
export type StoreReport = (report: FleetReport) => Promise<"accepted" | "stale" | "limited">;
export function producerHost(header: string | null, tokens: ProducerTokens): HostId | null {
  const configured = HOST_IDS.filter(host => tokens[host] !== undefined);
  if (!configured.length || configured.some(host => !/^[\x21-\x7e]{32,256}$/.test(tokens[host]!)) || (tokens.gimle && tokens.gimle === tokens.macbook)) return null;
  if (!header || !/^Bearer [\x21-\x7e]{32,256}$/.test(header)) return null;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  const supplied = digest(header.slice(7));
  let match: HostId | null = null;
  for (const host of configured) if (timingSafeEqual(supplied, digest(tokens[host]!))) match = host;
  return match;
}
class BodyLimit extends Error {}
async function body(request: Pick<Request, "body" | "headers">): Promise<unknown> {
  const size = request.headers.get("content-length");
  if (size && (!/^\d+$/.test(size) || Number(size) > 8192)) throw new BodyLimit();
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new Error();
  const reader = request.body?.getReader();
  if (!reader) throw new Error();
  const chunks: Uint8Array[] = []; let count = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      count += value.byteLength;
      if (count > 8192) { await reader.cancel(); throw new BodyLimit(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
}
export async function reportResponse(request: Pick<Request, "body" | "headers">, tokens: ProducerTokens, store: StoreReport, now = Date.now()): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store" };
  const reply = (status: number) => Response.json(status === 202 ? { accepted: true } : { error: status === 401 || status === 403 ? "unauthorized" : status === 503 ? "Fleet unavailable" : "Report rejected" }, { status, headers });
  const host = producerHost(request.headers.get("authorization"), tokens);
  if (!host) return reply(401);
  let report: FleetReport;
  try { report = validateReport(await body(request), now); }
  catch (error) { return reply(error instanceof BodyLimit ? 413 : 400); }
  if (report.hostId !== host) return reply(403);
  try {
    const result = await store(report);
    return reply(result === "accepted" ? 202 : result === "stale" ? 409 : result === "limited" ? 429 : 503);
  } catch { return reply(503); }
}
