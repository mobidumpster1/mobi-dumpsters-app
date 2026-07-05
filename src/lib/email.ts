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
