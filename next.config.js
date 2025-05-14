/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'cdn0.iconfinder.com'],
  },
  webpack(config, { isServer }) {
    // Enable handling SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // Add specific configuration for PDF.js
    if (isServer) {
      // Add polyfill for pdfjs in server environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      };
    }

    return config;
  },
  // This ensures a consistent behavior with trailing slashes
  trailingSlash: false,
  // Output standalone builds for better performance
  output: 'standalone',
  // Ignore punycode deprecation warning
  experimental: {
    serverComponentsExternalPackages: ["punycode", "pdfjs-dist", "jsdom", "pdfjs-dist/build/pdf.js", "pdfjs-dist/legacy/build/pdf.js"],
  },
  // Ensure API routes are properly handled
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  // Log the API routes to help with debugging
  onDemandEntries: {
    // Make Next.js keep pages in memory for longer during dev
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    // Poll interval for checking for changes
    pagesBufferLength: 5,
  },
};

module.exports = nextConfig;