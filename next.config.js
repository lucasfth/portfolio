const { withBotId } = require("botid/next/config");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Sharp is available — let next/image optimize with sharp
  },
  reactStrictMode: true,
  // The sentence check loads its ONNX model and the onnxruntime WASM from disk at runtime.
  serverExternalPackages: ["onnxruntime-web"],
  outputFileTracingIncludes: {
    "/api/game/play": ["./lib/game/sentence-model/**", "./node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm"],
    "/api/game/scores": ["./lib/game/sentence-model/**", "./node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm"],
  },
  typescript: {
    // SWC WASM bug on android/arm64 — CI runs tsc separately
    ignoreBuildErrors: true,
  },
};

// BotID proxies its challenge script through this site so blockers cannot strip it.
module.exports = withBotId(nextConfig);
