import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import "server-only";
import { isRadarEdition, type RadarEdition } from "./publication";



function authorized(header: string | null, expected: string | undefined): boolean {
  if (!expected || !/^[\x21-\x7e]{32,256}$/.test(expected) || !header || !/^Bearer [\x21-\x7e]{32,256}$/.test(header)) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(expected));
}

type RpcResult = { error: unknown | null };
type RpcClient = {
  rpc(name: string, args: { p_edition: RadarEdition }): {
    abortSignal(signal: AbortSignal): Promise<RpcResult>;
  };
};
type ClientFactory = (url: string, key: string, options: object) => RpcClient;

export async function writeRadarEdition(
  edition: RadarEdition,
  env: NodeJS.ProcessEnv = process.env,
  clientFactory: ClientFactory = createClient as unknown as ClientFactory,
): Promise<void> {
  const db = clientFactory(env.SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await db.rpc("publish_radar_edition", { p_edition: edition }).abortSignal(AbortSignal.timeout(5000));
  if (error) throw error;
}

export async function publishRadarRequest(
  request: Pick<Request, "headers" | "body">,
  env: NodeJS.ProcessEnv = process.env,
  publish?: (edition: RadarEdition) => Promise<unknown>,
 ): Promise<Response> {
  const response = (status: number, body: Record<string, unknown>) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (!env.RADAR_PUBLISH_TOKEN || !env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return response(503, { error: "Radar publisher unavailable" });
  if (!authorized(request.headers.get("authorization"), env.RADAR_PUBLISH_TOKEN)) return response(401, { error: "unauthorized" });

  try {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return response(400, { error: "invalid edition" });
    const reader = request.body?.getReader();
    if (!reader) return response(400, { error: "invalid edition" });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 64 * 1024) {
          await reader.cancel();
          return response(413, { error: "edition too large" });
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let edition: unknown;
    try {
      edition = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    } catch {
      return response(400, { error: "invalid edition" });
    }
    if (!isRadarEdition(edition)) return response(400, { error: "invalid edition" });

    await (publish ?? ((value) => writeRadarEdition(value, env)))(edition);
  } catch {
    return response(503, { error: "Radar publisher unavailable" });
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
