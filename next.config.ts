import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gpura.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.gpura.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "kerala-digital-archive.sgp1.digitaloceanspaces.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
