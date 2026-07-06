const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.BUSINESS_NOTIFICATION_EMAIL;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export function isEmailConfigured() {
  return Boolean(RESEND_API_KEY && NOTIFICATION_EMAIL);
}

// Sends a plain-text notification email to the business owner. Silently
// does nothing if email isn't configured yet, and never throws — a missed
// notification shouldn't block the booking request itself from saving.
export async function sendNotificationEmail(subject: string, body: string) {
  if (!isEmailConfigured()) return;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: NOTIFICATION_EMAIL,
        subject,
        text: body,
      }),
    });
    if (!response.ok) {
      console.error("Resend email failed:", await response.text());
    }
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}

// Sends an email to a customer (e.g. "we're on the way"). Unlike
// sendNotificationEmail this goes to an arbitrary address, not the fixed
// business inbox. Throws on failure — callers use this to show a real
// success/failure result to the staff member sending it, unlike the silent
// best-effort business notifications above.
export async function sendCustomerEmail(to: string, subject: string, body: string) {
  if (!RESEND_API_KEY) {
    throw new Error("Email isn't set up yet — add RESEND_API_KEY to send customer emails.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      text: body,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend email failed:", detail);
    throw new Error("Failed to send the email — check the Resend setup.");
  }
}
