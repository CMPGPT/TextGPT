import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'cdn0.iconfinder.com'],
  },
  webpack(config) {
    // Enable handling SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  // This ensures a consistent behavior with trailing slashes
  trailingSlash: false,
  // Output standalone builds for better performance
  output: 'standalone',
  // Ignore punycode deprecation warning
  experimental: {
    serverComponentsExternalPackages: ["punycode"],
  },
};

export default nextConfig;
