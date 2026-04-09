import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Required for cross-origin isolation (SharedArrayBuffer/WASM threads)
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          // credentialless: allows cross-origin images/fonts from CDNs (less strict than require-corp)
          // while still enabling SharedArrayBuffer
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
