import "server-only";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api, internal } from "../../convex/_generated/api";

interface SaveScoreInput {
  runId: string;
  date: string;
  normalizedNickname: string;
  displayNickname: string;
  level: number;
  elapsedMs: number;
}

type SavedScore = FunctionReturnType<typeof internal.game.saveBestScore>;

interface InternalAdminClient {
  setAdminAuth(token: string): void;
  mutation(reference: typeof internal.game.saveBestScore, args: SaveScoreInput): Promise<SavedScore>;
  mutation(reference: typeof internal.game.claimRun, args: { runId: string }): Promise<boolean>;
}

const NOT_CONFIGURED = "Portfolio leaderboard is not configured.";

/** A Convex deploy key ("prod:<deployment>|<secret>") is an admin key and names its deployment. */
export function deploymentUrlFromKey(key: string | undefined): string | null {
  const name = key?.match(/^(?:prod|preview|dev):([a-z0-9-]+)\|/u)?.[1];
  return name ? `https://${name}.convex.cloud` : null;
}

function adminKey(): string | undefined {
  return process.env.PORTFOLIO_CONVEX_ADMIN_KEY || process.env.CONVEX_DEPLOY_KEY;
}

function convexUrl(): string {
  // `convex deploy --cmd` sets NEXT_PUBLIC_CONVEX_URL during the build, so it carries the real
  // regional host (e.g. *.eu-west-1.convex.cloud). The key-derived URL only works for us-east deployments.
  const url =
    process.env.PORTFOLIO_CONVEX_URL ||
    process.env.NEXT_PUBLIC_CONVEX_URL ||
    deploymentUrlFromKey(adminKey());
  if (!url) throw new Error(`${NOT_CONFIGURED} Set CONVEX_DEPLOY_KEY.`);
  return url;
}

export function isSetupError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(NOT_CONFIGURED);
}

/** Reads use the public query; no admin key is involved. */
export function fetchLeaderboard(date: string) {
  return new ConvexHttpClient(convexUrl()).query(api.game.listScores, { date });
}

/** Writes are internal and need the deploy key, which only this server holds. */
function adminClient(): InternalAdminClient {
  const key = adminKey();
  if (!key) throw new Error(`${NOT_CONFIGURED} Set CONVEX_DEPLOY_KEY.`);
  // Convex's public client types omit the admin API used for internal functions.
  const client = new ConvexHttpClient(convexUrl()) as unknown as InternalAdminClient;
  client.setAdminAuth(key);
  return client;
}

export function claimRun(runId: string): Promise<boolean> {
  return adminClient().mutation(internal.game.claimRun, { runId });
}

export function storeBestScore(score: SaveScoreInput) {
  return adminClient().mutation(internal.game.saveBestScore, score);
}
