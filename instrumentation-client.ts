import { initBotId } from "botid/client/core";

// Vercel BotID runs an invisible challenge in the browser and attaches its result
// to these requests. The server verifies it before granting a free leaderboard entry.
initBotId({
  protect: [{ path: "/api/game/scores", method: "POST" }],
});
