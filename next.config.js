const { withBotId } = require("botid/next/config");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Sharp is available — let next/image optimize with sharp
  },
  reactStrictMode: true,
  typescript: {
    // SWC WASM bug on android/arm64 — CI runs tsc separately
    ignoreBuildErrors: true,
  },
};

// BotID proxies its challenge script through this site so blockers cannot strip it.
module.exports = withBotId(nextConfig);
