import "server-only";
import { checkBotId } from "botid/server";
import { isSameOriginBrowser } from "./x402";

export type HumanCheck = "human" | "not_human" | "unavailable";

/**
 * Decides whether a leaderboard save is free.
 * On Vercel, Vercel BotID must classify the session as human: an invisible browser
 * challenge, verified server-side, plus Deep Analysis when enabled in the project.
 * Off Vercel (local runs, tests) only the Fetch Metadata check applies.
 * Verified bots such as signed AI agents are not human, so they pay.
 */
export async function checkHuman(request: Request): Promise<HumanCheck> {
  if (!isSameOriginBrowser(request)) return "not_human";
  if (!process.env.VERCEL) return "human";
  try {
    const result = await checkBotId();
    return result.isHuman && !result.isBot && !result.isVerifiedBot && !result.bypassed ? "human" : "not_human";
  } catch {
    return "unavailable";
  }
}
