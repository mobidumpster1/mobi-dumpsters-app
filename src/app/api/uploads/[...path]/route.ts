import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { uploadsRoot } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const root = uploadsRoot();
  const requestedPath = path.join(root, ...segments);

  // Prevent path traversal outside the uploads directory.
  if (!requestedPath.startsWith(root)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await readFile(requestedPath);
    const ext = path.extname(requestedPath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(file), {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
