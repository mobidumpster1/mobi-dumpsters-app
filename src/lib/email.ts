import { branding } from "@/lib/branding";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.BUSINESS_NOTIFICATION_EMAIL;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export function isEmailConfigured() {
  return Boolean(RESEND_API_KEY && NOTIFICATION_EMAIL);
}

// Vercel sets VERCEL_URL automatically on every deployment (including cron
// invocations, which have no incoming request to read a host header from),
// so the logo in emails resolves without threading a URL through every
// call site. Falls back to localhost for local dev, where the image just
// won't load — expected, not worth working around.
function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Turns the plain-text body every email template already produces into a
// simple, table-based HTML email (inline styles only — email clients don't
// reliably support stylesheets) with the business logo and brand color up
// top. Blank lines become paragraph breaks, single newlines become <br>.
function wrapEmailHtml(body: string): string {
  const paragraphs = body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => escapeHtml(p).replace(/\n/g, "<br>"))
    .filter(Boolean);

  const logoUrl = `${siteOrigin()}${branding.logoPath}`;

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f7f8f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td align="center" style="background-color:${branding.primaryColor};padding:24px;">
                <img src="${logoUrl}" alt="${escapeHtml(branding.businessName)}" width="56" height="56" style="border-radius:12px;display:block;margin:0 auto 8px;" />
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">${escapeHtml(branding.businessName)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;color:#1a1a1a;font-size:15px;line-height:1.6;">
                ${paragraphs.map((p) => `<p style="margin:0 0 16px;">${p}</p>`).join("\n")}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background-color:#fafafa;color:#71717a;font-size:12px;text-align:center;">
                ${escapeHtml(branding.businessName)}${branding.phone ? ` · ${escapeHtml(branding.phone)}` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
        html: wrapEmailHtml(body),
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
      html: wrapEmailHtml(body),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend email failed:", detail);
    throw new Error("Failed to send the email — check the Resend setup.");
  }
}
