import { execSync } from "node:child_process";

// Production builds push the game's Convex functions first, so the site and the leaderboard ship together.
// Preview builds skip the push: an unmerged branch must not overwrite the live Convex functions.
const deployConvex = process.env.CONVEX_DEPLOY_KEY && process.env.VERCEL_ENV === "production";
execSync(deployConvex ? 'npx convex deploy --cmd "next build"' : "next build", { stdio: "inherit" });
