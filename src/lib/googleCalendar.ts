import { google } from "googleapis";
import fs from "fs";
import path from "path";

const KEY_PATH =
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ??
  path.join(process.cwd(), "google-service-account.json");
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

// On Vercel there's no local key file (it's git-ignored on purpose), so the
// credentials are passed as a JSON string in an environment variable
// instead. Locally, the key file still works for convenience.
function getCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  if (fs.existsSync(KEY_PATH)) {
    return JSON.parse(fs.readFileSync(KEY_PATH, "utf-8"));
  }
  return null;
}

function isConfigured() {
  return Boolean(CALENDAR_ID) && Boolean(getCredentials());
}

async function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
  return google.calendar({ version: "v3", auth });
}

export type CalendarBookingInput = {
  customerName: string;
  deliveryAddress: string;
  notes: string | null;
  items: {
    label: string;
    categoryName: string;
    startDate: Date;
    expectedReturnDate: Date;
    price: number;
  }[];
};

// Google Calendar event colorId values — see
// https://developers.google.com/calendar/api/v3/reference/colors/get
const CATEGORY_COLOR_IDS: Record<string, string> = {
  "roll-off dumpster": "6", // Tangerine
  "dump trailer": "10", // Basil
};

function colorIdForItems(items: { categoryName: string }[]): string | undefined {
  const category = items[0]?.categoryName.toLowerCase();
  return category ? CATEGORY_COLOR_IDS[category] : undefined;
}

// Creates one all-day Google Calendar event spanning a booking's earliest
// delivery to latest return date. Returns the event ID, or null if
// Calendar isn't configured yet or the push fails — a booking should
// still save even if the calendar push doesn't work.
export async function pushBookingToCalendar(
  booking: CalendarBookingInput
): Promise<string | null> {
  if (!isConfigured() || booking.items.length === 0) return null;

  try {
    const calendar = await getCalendarClient();

    const starts = booking.items.map((i) => i.startDate.getTime());
    const returns = booking.items.map((i) => i.expectedReturnDate.getTime());
    const earliestStart = new Date(Math.min(...starts));
    const latestReturn = new Date(Math.max(...returns));
    // Google all-day events use an exclusive end date.
    const endExclusive = new Date(latestReturn);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const itemLines = booking.items
      .map(
        (i) =>
          `${i.label}: ${i.startDate.toISOString().slice(0, 10)} to ${i.expectedReturnDate.toISOString().slice(0, 10)} ($${i.price.toFixed(2)})`
      )
      .join("\n");

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `${booking.customerName} — ${booking.items.map((i) => i.label).join(", ")}`,
        location: booking.deliveryAddress,
        description: [itemLines, booking.notes].filter(Boolean).join("\n\n"),
        start: { date: earliestStart.toISOString().slice(0, 10) },
        end: { date: endExclusive.toISOString().slice(0, 10) },
        colorId: colorIdForItems(booking.items),
      },
    });

    return response.data.id ?? null;
  } catch (error) {
    console.error("Failed to push booking to Google Calendar:", error);
    return null;
  }
}

// Removes a previously-pushed event — used when a booking is cancelled, so
// the calendar doesn't keep showing a job that's no longer happening.
// Silently no-ops if Calendar isn't configured or the event's already gone.
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!isConfigured()) return;
  try {
    const calendar = await getCalendarClient();
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
  } catch (error) {
    console.error("Failed to delete Google Calendar event:", error);
  }
}
