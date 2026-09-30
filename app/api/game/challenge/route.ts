import { createChallenge } from "@/lib/game/challenge";

export const dynamic = "force-dynamic";

/** The current rules as JSON. Rules 5 to 8 rotate daily; 1 to 4 follow the UTC clock. */
export function GET() {
  const now = new Date();
  const bucketEndsAt = Math.floor(now.getTime() / 300_000 + 1) * 300_000;
  return Response.json(
    { ...createChallenge(now), changesAt: new Date(bucketEndsAt).toISOString(), howToPlay: "https://lucashanson.dk/game.md" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
