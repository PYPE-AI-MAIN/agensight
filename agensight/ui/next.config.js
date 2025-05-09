/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static exports
  images: {
    unoptimized: true, // Required for static export
  },
  // Optionally disable server components since this is a static site
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true, // Add trailing slashes for cleaner URLs in static export
};

module.exports = nextConfig; 