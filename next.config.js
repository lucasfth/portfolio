/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  distDir: "out",

  // Remove basePath and assetPrefix for custom domain
  basePath: "",
  assetPrefix: "",

  // Disable development overlay
  devIndicators: {
    buildActivity: false,
  },

  // Add experimental features for better static export
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
