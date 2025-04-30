/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Add any additional configuration here
};

module.exports = nextConfig;