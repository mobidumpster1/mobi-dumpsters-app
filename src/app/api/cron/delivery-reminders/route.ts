import { NextResponse } from "next/server";
import { sendPendingDeliveryReminders } from "@/lib/deliveryReminder";
import { requireCronSecret } from "@/lib/cronAuth";

// Hit once a day by Vercel Cron (see vercel.json). Same auth pattern as
// /api/cron/review-requests — see that route for why.
export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await sendPendingDeliveryReminders();
  return NextResponse.json(result);
}
