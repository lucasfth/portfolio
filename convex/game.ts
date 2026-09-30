import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { rankScores, shouldReplaceBest } from "./leaderboard";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function assertIsoDate(date: string): void {
  if (!DATE_PATTERN.test(date)) throw new Error("Invalid leaderboard date.");
  if (new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
    throw new Error("Invalid leaderboard date.");
  }
}

function assertScoreFields(args: {
  date: string;
  normalizedNickname: string;
  displayNickname: string;
  level: number;
  elapsedMs: number;
}): void {
  assertIsoDate(args.date);
  const displayLength = Array.from(args.displayNickname).length;
  const normalizedLength = Array.from(args.normalizedNickname).length;
  const normalizedDisplay = args.displayNickname.normalize("NFKC").toLowerCase();
  if (
    displayLength < 1 ||
    displayLength > 24 ||
    normalizedLength < 1 ||
    normalizedLength > 48 ||
    normalizedDisplay !== args.normalizedNickname
  ) {
    throw new Error("Invalid leaderboard nickname.");
  }
  if (!Number.isInteger(args.level) || args.level < 1 || args.level > 20) {
    throw new Error("Invalid leaderboard level.");
  }
  if (!Number.isInteger(args.elapsedMs) || args.elapsedMs < 0 || args.elapsedMs > 86_400_000) {
    throw new Error("Invalid leaderboard elapsed time.");
  }
}

export const listScores = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    assertIsoDate(date);
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_date_and_normalized_nickname", (query) => query.eq("date", date))
      .collect();
    return rankScores(scores, 50).map(
      ({ normalizedNickname, displayNickname, level, elapsedMs, createdAt }) => ({
        normalizedNickname,
        displayNickname,
        level,
        elapsedMs,
        createdAt,
      })
    );
  },
});

export const saveBestScore = internalMutation({
  args: {
    date: v.string(),
    normalizedNickname: v.string(),
    displayNickname: v.string(),
    level: v.number(),
    elapsedMs: v.number(),
  },
  handler: async (ctx, args) => {
    assertScoreFields(args);
    const previous = await ctx.db
      .query("scores")
      .withIndex("by_date_and_normalized_nickname", (query) =>
        query.eq("date", args.date).eq("normalizedNickname", args.normalizedNickname)
      )
      .unique();
    const next = { ...args, createdAt: Date.now() };
    if (previous && !shouldReplaceBest(previous, next)) {
      return {
        displayNickname: previous.displayNickname,
        level: previous.level,
        elapsedMs: previous.elapsedMs,
        createdAt: previous.createdAt,
      };
    }

    if (previous) {
      await ctx.db.patch(previous._id, {
        displayNickname: args.displayNickname,
        level: args.level,
        elapsedMs: args.elapsedMs,
      });
      return {
        displayNickname: args.displayNickname,
        level: args.level,
        elapsedMs: args.elapsedMs,
        createdAt: previous.createdAt,
      };
    }

    await ctx.db.insert("scores", next);
    return {
      displayNickname: args.displayNickname,
      level: args.level,
      elapsedMs: args.elapsedMs,
      createdAt: next.createdAt,
    };
  },
});
