import { execSync } from "node:child_process";

execSync("node scripts/gallery-manifest.mjs", { stdio: "inherit" });

// Database migrations are applied explicitly, never as a side effect of a website build.
execSync("next build", { stdio: "inherit" });
