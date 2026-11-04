import type { NextConfig } from "next";

// Photos uploaded to Supabase Storage (vendor-photos and journal buckets) are served by next/image.
const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : undefined;

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: storage ? [{ protocol: "https", hostname: storage.hostname, pathname: "/storage/v1/object/public/**" }] : [],
  },
  partialPrefetching: true,
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
