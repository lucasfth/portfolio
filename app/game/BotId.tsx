"use client";

import { BotIdClient } from "botid/client";

/**
 * Vercel BotID runs an invisible challenge and attaches its result to score
 * saves. Mounted only on /game so other pages skip the challenge script.
 */
export default function BotId() {
  return <BotIdClient protect={[{ path: "/api/game/scores", method: "POST" }]} />;
}
