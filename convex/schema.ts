import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scores: defineTable({
    date: v.string(),
    normalizedNickname: v.string(),
    displayNickname: v.string(),
    level: v.number(),
    elapsedMs: v.number(),
    createdAt: v.number(),
  }).index("by_date_and_normalized_nickname", ["date", "normalizedNickname"]),
});
