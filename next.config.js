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

module.exports = nextConfig;
