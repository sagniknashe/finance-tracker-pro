/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep native/Node-only packages out of the webpack bundle and require them
  // at runtime: argon2 (native), pdf-parse and xlsx (Node file/stream usage).
  serverExternalPackages: [
    "argon2",
    "pdf-parse",
    "xlsx",
    "jspdf",
    "jspdf-autotable",
  ],
  // Security headers applied to every route.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
