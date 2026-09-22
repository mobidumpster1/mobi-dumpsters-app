import { NextResponse } from "next/server";
import { syncAllConnectedOrganizations } from "@/lib/googleBusinessProfile";
import { requireCronSecret } from "@/lib/cronAuth";

// Hit once a day by Vercel Cron (see vercel.json). Not behind the app's
// password gate (see proxy.ts) since Vercel Cron can't log in — protected
// instead by requireCronSecret, which checks the Authorization header
// Vercel sends against CRON_SECRET.
export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await syncAllConnectedOrganizations();
  return NextResponse.json(result);
}
