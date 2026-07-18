import { NextResponse } from "next/server";
import { syncAllConnectedOrganizations } from "@/lib/googleBusinessProfile";

// Hit once a day by Vercel Cron (see vercel.json). Not behind the app's
// password gate (see proxy.ts) since Vercel Cron can't log in — protected
// instead by comparing the Authorization header Vercel sends against
// CRON_SECRET, when that env var is set.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllConnectedOrganizations();
  return NextResponse.json(result);
}
