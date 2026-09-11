import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

// Video background source uploads (website-builder/video/...) get a much
// tighter cap than the blanket image/general limit below — they're raw
// footage headed straight into /api/transcode-video, and a huge source file
// just means a slower transcode for no real benefit at background-video
// size. Everything else keeps today's generous 500MB allowance.
const RAW_VIDEO_PATHNAME_PREFIX = "website-builder/video/";
const RAW_VIDEO_MAX_BYTES = 150 * 1024 * 1024;

// Issues short-lived client tokens so the browser can upload large files
// (photos and especially videos) straight to Vercel Blob, bypassing the
// ~4.5MB request body limit that a server action / API route would hit if
// the file were routed through it first. This route itself only ever
// handles the small JSON handshake, never the file bytes.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (pathname.startsWith(RAW_VIDEO_PATHNAME_PREFIX)) {
          return {
            allowedContentTypes: ["video/*"],
            addRandomSuffix: true,
            maximumSizeInBytes: RAW_VIDEO_MAX_BYTES,
          };
        }
        return {
          allowedContentTypes: ["image/*", "video/*"],
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Blob upload token generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
