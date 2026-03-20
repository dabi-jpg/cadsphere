import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Security: Configure allowed image domains and content security.
   * serverExternalPackages ensures Prisma client works correctly in API routes.
   */
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    serverActions: {
      bodySizeLimit: '210mb',
    },
  },

  /**
   * Turbopack configuration.
   * Next.js 16 uses Turbopack by default. Turbopack automatically handles
   * Node built-in exclusion for browser bundles (fs, path, crypto etc.)
   * which is needed by occt-import-js and dxf-viewer.
   */
  turbopack: {},

  /** SECURITY: Don't expose Next.js version in X-Powered-By header */
  poweredByHeader: false,

  /** Enable gzip compression */
  compress: true,

  /**
   * SECURITY: OWASP-recommended HTTP response headers.
   * These protect against clickjacking, MIME-sniffing, and information leakage.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/api/files/upload",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
  async rewrites() {
    return [];
  },
  webpack: (config: any) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
