import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Only used by SectionBackgroundMedia.tsx's next/image poster/image
    // background (the deliberate exception to this codebase's usual plain
    // <img> for user-uploaded content — see that file's comment) so it can
    // get automatic AVIF/WebP + preload for the LCP element.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  // @ffmpeg-installer/ffmpeg and @ffprobe-installer/ffprobe pick their
  // platform-specific binary via a runtime require() Turbopack's bundler
  // can't statically follow ("Module not found: Can't resolve <dynamic>").
  // Marking them external skips bundling and leaves them to Node's normal
  // module resolution at runtime, which handles the dynamic require fine —
  // see src/app/api/transcode-video/route.ts.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "@ffprobe-installer/ffprobe", "fluent-ffmpeg"],
};

export default nextConfig;
