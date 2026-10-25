import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run dev:preview` builds into its own folder, so a second dev server
  // (another editor or agent session) never overwrites the first one's files.
  distDir: process.env.npm_lifecycle_event === "dev:preview" ? ".next-preview" : ".next",
};

export default nextConfig;
