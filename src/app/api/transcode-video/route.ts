import { NextResponse } from "next/server";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpeg, { type FfprobeData } from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { put } from "@vercel/blob";
import { requireUser, requirePlanFor } from "@/lib/session";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// ffmpeg needs a real filesystem + native binary — can't run on the Edge
// runtime. This is the one route in the app that does real CPU-bound work,
// hence the generous maxDuration (Vercel will cap it to whatever the
// deployed plan actually allows either way).
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_OUTPUT_WIDTH = 1920;
const MAX_CLIP_SECONDS = 20;
const TARGET_VIDEO_BITRATE = "2500k";
const MAX_VIDEO_BITRATE = "3000k";

// Turns a background hero clip (whatever a customer uploaded — any
// resolution, any length up to the 30s pre-check cap, with audio) into
// what a muted looping background actually needs: max 1920px wide, capped
// bitrate, trimmed to ~20s, no audio track at all (it's muted anyway — a
// silent track is pure dead weight), plus an H.264 mp4 and a WebM so the
// browser can pick whichever it decodes more efficiently, and a poster
// frame so there's never a black flash before the video can play.
export async function POST(request: Request): Promise<NextResponse> {
  const user = await requireUser();
  requirePlanFor(user, "team");

  const body = (await request.json()) as { blobUrl?: unknown };
  const blobUrl = typeof body.blobUrl === "string" ? body.blobUrl : null;
  if (!blobUrl) {
    return NextResponse.json({ error: "Missing blobUrl" }, { status: 400 });
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "wb-video-"));
  const sourcePath = path.join(workDir, "source");
  const mp4Path = path.join(workDir, "output.mp4");
  const webmPath = path.join(workDir, "output.webm");
  const posterFilename = "poster.jpg";
  const posterPath = path.join(workDir, posterFilename);

  try {
    const sourceRes = await fetch(blobUrl);
    if (!sourceRes.ok) throw new Error("Could not read the uploaded video.");
    await writeFile(sourcePath, Buffer.from(await sourceRes.arrayBuffer()));

    const probe = await ffprobeAsync(sourcePath);
    const sourceDuration = probe.format.duration ?? MAX_CLIP_SECONDS;
    const clipDuration = Math.min(sourceDuration, MAX_CLIP_SECONDS);

    await Promise.all([
      transcode(sourcePath, mp4Path, "mp4", clipDuration),
      transcode(sourcePath, webmPath, "webm", clipDuration),
      extractPoster(sourcePath, workDir, posterFilename),
    ]);

    const posterProbe = await ffprobeAsync(posterPath);
    const posterStream = posterProbe.streams[0];

    const [mp4Buffer, webmBuffer, posterBuffer] = await Promise.all([
      readFile(mp4Path),
      readFile(webmPath),
      readFile(posterPath),
    ]);

    const stamp = Date.now();
    const [mp4Blob, webmBlob, posterBlob] = await Promise.all([
      put(`website-builder/video/${stamp}.mp4`, mp4Buffer, { access: "public", contentType: "video/mp4" }),
      put(`website-builder/video/${stamp}.webm`, webmBuffer, { access: "public", contentType: "video/webm" }),
      put(`website-builder/video/${stamp}-poster.jpg`, posterBuffer, { access: "public", contentType: "image/jpeg" }),
    ]);

    return NextResponse.json({
      videoUrl: mp4Blob.url,
      webmUrl: webmBlob.url,
      posterUrl: posterBlob.url,
      posterWidth: posterStream?.width ?? MAX_OUTPUT_WIDTH,
      posterHeight: posterStream?.height ?? Math.round((MAX_OUTPUT_WIDTH * 9) / 16),
      fileSizeBytes: mp4Buffer.byteLength + webmBuffer.byteLength,
    });
  } catch (error) {
    console.error("Video transcode failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video processing failed — try a shorter clip." },
      { status: 500 }
    );
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function ffprobeAsync(filePath: string): Promise<FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

function transcode(sourcePath: string, outputPath: string, format: "mp4" | "webm", clipDuration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(sourcePath)
      .noAudio()
      .duration(clipDuration)
      // Scale down to max width only (never up), even height (required by
      // yuv420p), preserving aspect ratio.
      .videoFilters(`scale='min(${MAX_OUTPUT_WIDTH},iw)':-2`)
      .outputOptions([`-b:v ${TARGET_VIDEO_BITRATE}`, `-maxrate ${MAX_VIDEO_BITRATE}`, "-bufsize 5000k"]);

    if (format === "mp4") {
      command
        .videoCodec("libx264")
        .outputOptions(["-preset veryfast", "-pix_fmt yuv420p", "-movflags +faststart"])
        .format("mp4");
    } else {
      command.videoCodec("libvpx-vp9").format("webm");
    }

    command.on("end", () => resolve()).on("error", reject).save(outputPath);
  });
}

// Not using fluent-ffmpeg's .screenshots() helper — its `size` option
// forces an exact width (upscaling any source narrower than
// MAX_OUTPUT_WIDTH), where the same capped-scale filter used for the
// video itself (shrink only, never enlarge) is what we actually want.
function extractPoster(sourcePath: string, workDir: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .seekInput(1)
      .outputOptions(["-vframes 1", `-vf scale='min(${MAX_OUTPUT_WIDTH},iw)':-2`])
      .on("end", () => resolve())
      .on("error", reject)
      .save(path.join(workDir, filename));
  });
}
