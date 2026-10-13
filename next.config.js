const { withBotId } = require("botid/next/config");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Sharp is available — let next/image optimize with sharp
  },
  reactStrictMode: true,
  // The sentence check loads its ONNX model and the onnxruntime WASM from disk at runtime.
  serverExternalPackages: ["onnxruntime-web"],
  // Function Storage: keep bundles to what runs. Photos are served from the CDN, the gallery
  // manifest replaces runtime folder reads, and the game needs only one onnxruntime WASM build.
  outputFileTracingExcludes: {
    "*": ["./public/images/**", "./public/fonts/**"],
    "/api/game/*": [
      "./node_modules/onnxruntime-web/dist/*.map",
      "./node_modules/onnxruntime-web/dist/ort.{all,jspi,webgl,webgpu,wasm,bundle}*",
      "./node_modules/onnxruntime-web/dist/ort.{js,mjs,min.js,min.mjs,node.min.js}",
      "./node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.{asyncify,jsep,jspi}.*",
    ],
    "/api/og": ["./node_modules/sharp/**", "./node_modules/@img/**"],
  },
  outputFileTracingIncludes: {
    "/api/game/play": ["./lib/game/sentence-model/**", "./node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm"],
    "/api/game/scores": ["./lib/game/sentence-model/**", "./node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm"],
  },
  // Short public link for nocturne. Promote this, never the machine address, so the
  // host can move without breaking links. Temporary (307) so the target can change.
  async redirects() {
    return [
      { source: "/nocturne", destination: "https://freyr.tail5eca08.ts.net:8443/", permanent: false },
      { source: "/nocturne/:path*", destination: "https://freyr.tail5eca08.ts.net:8443/:path*", permanent: false },
    ];
  },
  typescript: {
    // SWC WASM bug on android/arm64 — CI runs tsc separately
    ignoreBuildErrors: true,
  },
};

// BotID proxies its challenge script through this site so blockers cannot strip it.
module.exports = withBotId(nextConfig);
