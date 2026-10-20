import type { NextConfig } from "next";

// Set server timezone to IST
process.env.TZ = "Asia/Kolkata";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
