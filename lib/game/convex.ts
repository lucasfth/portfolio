import "server-only";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { internal } from "../../convex/_generated/api";

interface SaveScoreInput {
  date: string;
  normalizedNickname: string;
  displayNickname: string;
  level: number;
  elapsedMs: number;
}

type LeaderboardRows = FunctionReturnType<typeof internal.game.listScores>;
type SavedScore = FunctionReturnType<typeof internal.game.saveBestScore>;

interface InternalAdminClient {
  setAdminAuth(token: string): void;
  query(
    reference: typeof internal.game.listScores,
    args: { date: string }
  ): Promise<LeaderboardRows>;
  mutation(
    reference: typeof internal.game.saveBestScore,
    args: SaveScoreInput
  ): Promise<SavedScore>;
}

function createClient(): InternalAdminClient {
  const url = process.env.PORTFOLIO_CONVEX_URL;
  const adminKey = process.env.PORTFOLIO_CONVEX_ADMIN_KEY;
  if (!url || !adminKey) {
    throw new Error(
      "Portfolio leaderboard is not configured. Set PORTFOLIO_CONVEX_URL and PORTFOLIO_CONVEX_ADMIN_KEY."
    );
  }
  // Convex's public client types omit the admin API used for internal functions.
  const client = new ConvexHttpClient(url) as unknown as InternalAdminClient;
  client.setAdminAuth(adminKey);
  return client;
}

export function fetchLeaderboard(date: string) {
  return createClient().query(internal.game.listScores, { date });
}

export function storeBestScore(score: SaveScoreInput) {
  return createClient().mutation(internal.game.saveBestScore, score);
}
