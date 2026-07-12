import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPublicOrganizationId } from "@/lib/session";

// Public, cross-origin, no-auth endpoint — the whole point is to be
// fetched from a <script> pasted into the customer's own website (a
// different origin than the app), so CORS is wide open. It only ever
// returns dates, nothing about who booked or what was booked, so there's
// nothing sensitive to protect here the way there would be for, say, an
// endpoint that returned customer names or addresses.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300", // 5 min — busy enough that near-live is fine
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const WINDOW_DAYS = 90;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const organizationId = await getPublicOrganizationId();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + WINDOW_DAYS);

  const items = await db.bookingItem.findMany({
    where: {
      booking: {
        organizationId,
        status: { in: ["confirmed", "in_progress"] },
      },
      startDate: { lte: windowEnd },
      OR: [
        { actualReturnDate: null },
        { actualReturnDate: { gte: today } },
      ],
    },
    select: { startDate: true, expectedReturnDate: true, actualReturnDate: true },
  });

  const busyDates = new Set<string>();
  for (const item of items) {
    const rangeEnd = item.actualReturnDate ?? item.expectedReturnDate;
    const start = item.startDate < today ? today : item.startDate;
    const end = rangeEnd > windowEnd ? windowEnd : rangeEnd;

    const cursor = new Date(start);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor <= end) {
      busyDates.add(toDateKey(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return NextResponse.json(
    { busyDates: Array.from(busyDates).sort() },
    { headers: CORS_HEADERS }
  );
}
