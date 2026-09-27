/** @type {import('next').NextConfig} */
const nextConfig = {
  // Local preview is often opened via 127.0.0.1 while Next binds localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    // Load the XRPL client from node_modules at runtime instead of bundling it: webpack breaks the `ws`
    // WebSocket library's optional native helpers ("bufferUtil.mask is not a function"), which makes every
    // route that talks to the ledger hang (docs/BUGS.md, 2026-09-26).
    serverComponentsExternalPackages: ["xrpl", "ws"],
  },
};
export default nextConfig;
