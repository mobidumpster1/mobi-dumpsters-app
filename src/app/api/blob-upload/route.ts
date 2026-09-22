import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Video background source uploads (website-builder/video/...) get a much
// tighter cap than the blanket image/general limit below — they're raw
// footage headed straight into /api/transcode-video, and a huge source file
// just means a slower transcode for no real benefit at background-video
// size. Everything else keeps today's generous 500MB allowance.
const RAW_VIDEO_PATHNAME_PREFIX = "website-builder/video/";
const RAW_VIDEO_MAX_BYTES = 150 * 1024 * 1024;

// The one legitimate unauthenticated caller: the public on-site/online
// agreement-signing page (src/app/booking/[id]/complete), which has no
// staff session to check and uses the booking id itself as its bearer
// token (same pattern as that page's own data lookup). Every other
// upload surface in the app is staff-only.
const PUBLIC_SIGNATURE_PATHNAME = /^agreements\/([^/]+)\//;

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
        const user = await getCurrentUser();
        if (!user) {
          const bookingId = pathname.match(PUBLIC_SIGNATURE_PATHNAME)?.[1];
          const booking = bookingId
            ? await db.booking.findUnique({ where: { id: bookingId }, select: { id: true } })
            : null;
          if (!booking) {
            throw new Error("Not authorized to upload here.");
          }
        }

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
