import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../supabase/database.types";

type Score = Tables<"game_scores">;
type SaveScoreInput = {
  runId: string;
  date: Score["date"];
  normalizedNickname: Score["normalized_nickname"];
  displayNickname: Score["display_nickname"];
  level: Score["level"];
  elapsedMs: Score["elapsed_ms"];
};

const NOT_CONFIGURED = "Portfolio leaderboard is not configured.";

function database() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error(`${NOT_CONFIGURED} Set SUPABASE_URL and SUPABASE_SECRET_KEY.`);
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function isSetupError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(NOT_CONFIGURED);
}

function scoreResponse(row: Score) {
  return {
    normalizedNickname: row.normalized_nickname,
    displayNickname: row.display_nickname,
    level: row.level,
    elapsedMs: row.elapsed_ms,
    createdAt: row.created_at,
  };
}

export async function fetchLeaderboard(date: string) {
  // Paginate the date-scoped query: PostgREST caps each response. JavaScript's
  // UTF-16 comparison preserves the original ranking for supplementary characters.
  const client = database();
  const rows: Score[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("game_scores")
      .select("*")
      .eq("date", date)
      .order("normalized_nickname", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  rows.sort((left, right) => {
    if (left.level !== right.level) return right.level - left.level;
    if (left.elapsed_ms !== right.elapsed_ms) return left.elapsed_ms - right.elapsed_ms;
    if (left.normalized_nickname < right.normalized_nickname) return -1;
    if (left.normalized_nickname > right.normalized_nickname) return 1;
    return 0;
  });
  return rows.slice(0, 50).map(scoreResponse);
}

export async function claimRun(runId: string): Promise<boolean> {
  const { data, error } = await database().rpc("claim_game_run", { p_run_id: runId });
  if (error) throw error;
  return data;
}

export async function storeBestScore(score: SaveScoreInput) {
  const { data, error } = await database().rpc("save_game_best_score", {
    p_run_id: score.runId,
    p_date: score.date,
    p_normalized_nickname: score.normalizedNickname,
    p_display_nickname: score.displayNickname,
    p_level: score.level,
    p_elapsed_ms: score.elapsedMs,
  });
  if (error) throw error;
  return scoreResponse(data);
}
