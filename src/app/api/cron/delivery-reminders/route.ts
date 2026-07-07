import { NextResponse } from "next/server";
import { sendPendingDeliveryReminders } from "@/lib/deliveryReminder";

// Hit once a day by Vercel Cron (see vercel.json). Same auth pattern as
// /api/cron/review-requests — see that route for why.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendPendingDeliveryReminders();
  return NextResponse.json(result);
}
