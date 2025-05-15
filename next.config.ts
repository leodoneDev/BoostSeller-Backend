import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  api: {
    bodyParser: false, // Important for file uploads!
  },
};

export default nextConfig;
