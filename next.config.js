/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel-ready configuration: remove static export and trailing slash
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  experimental: {
    // keep app directory-related experimental flags if needed
  },
};

module.exports = nextConfig;
