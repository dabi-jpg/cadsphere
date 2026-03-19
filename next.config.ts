import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Security: Configure allowed image domains and content security.
   * serverExternalPackages ensures Prisma client works correctly in API routes.
   */
  serverExternalPackages: ["@prisma/client"],

  /**
   * Turbopack configuration.
   * Next.js 16 uses Turbopack by default. Turbopack automatically handles
   * Node built-in exclusion for browser bundles (fs, path, crypto etc.)
   * which is needed by occt-import-js and dxf-viewer.
   */
  turbopack: {},

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
    ];
  },
};

export default nextConfig;

