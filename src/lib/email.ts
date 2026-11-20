import { db } from "@/lib/db";
import { getOrgContact, type OrgContact } from "@/lib/orgContact";
import { getOrgBranding, NEUTRAL_BRAND_COLOR } from "@/lib/orgBranding";

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
export function siteOrigin() {
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

// Who an email is sent "as": the business's name, logo, color and phone, so a
// customer of one business never sees another business's identity.
type EmailIdentity = {
  businessName: string;
  logoUrl: string | null;
  color: string;
  phone: string;
};

// Turns the plain-text body every email template already produces into a
// simple, table-based HTML email (inline styles only: email clients don't
// reliably support stylesheets) with the business logo and brand color up
// top. Blank lines become paragraph breaks, single newlines become <br>.
// With no identity (platform emails like a password reset that aren't sent
// on behalf of a business) it is plain, with no logo or business footer.
function wrapEmailHtml(body: string, identity?: EmailIdentity): string {
  const paragraphs = body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => escapeHtml(p).replace(/\n/g, "<br>"))
    .filter(Boolean);

  const color = identity?.color ?? NEUTRAL_BRAND_COLOR;
  const absoluteLogo = identity?.logoUrl
    ? /^https?:\/\//i.test(identity.logoUrl)
      ? identity.logoUrl
      : `${siteOrigin()}${identity.logoUrl.startsWith("/") ? "" : "/"}${identity.logoUrl}`
    : null;
  const header = identity
    ? `<tr>
              <td align="center" style="background-color:#ffffff;padding:24px 24px 16px;border-bottom:4px solid ${color};">
                ${
                  absoluteLogo
                    ? `<img src="${absoluteLogo}" alt="${escapeHtml(identity.businessName)}" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;" />`
                    : `<div style="font-size:20px;font-weight:bold;color:#1a1a1a;">${escapeHtml(identity.businessName)}</div>`
                }
              </td>
            </tr>`
    : "";
  const footer = identity
    ? `<tr>
              <td style="padding:16px 24px;background-color:#fafafa;color:#71717a;font-size:12px;text-align:center;">
                ${escapeHtml(identity.businessName)}${identity.phone ? ` · ${escapeHtml(identity.phone)}` : ""}
              </td>
            </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f7f8f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            ${header}
            <tr>
              <td style="padding:28px 24px;color:#1a1a1a;font-size:15px;line-height:1.6;">
                ${paragraphs.map((p) => `<p style="margin:0 0 16px;">${p}</p>`).join("\n")}
              </td>
            </tr>
            ${footer}
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
// `to` lets a caller route the alert to one business's own inbox
// (Organization.notificationEmail, see src/lib/orgContact.ts) instead of
// the single NOTIFICATION_EMAIL inbox; omitted, behavior is unchanged.
export async function sendNotificationEmail(subject: string, body: string, to?: string | null) {
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
        to: to || NOTIFICATION_EMAIL,
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
// best-effort business notifications above. Returns Resend's own id for
// the send, so a later bounce webhook can be matched back to exactly
// this email instead of just guessing "the most recent one."
// organizationId says which business this email is sent on behalf of: it
// supplies the logo, color, name and phone in the email, the sender name, and
// the default reply-to (that business's own inbox, never another business's).
// It also opts the send into delivery tracking (EmailDeliveryLog, updated by
// /api/webhooks/resend as Resend posts events back) unless options.untracked
// is set; password-reset style sends are branded but not tracked. With no
// organizationId the email is plain and platform-level.
export async function sendCustomerEmail(
  to: string,
  subject: string,
  body: string,
  replyTo?: string,
  organizationId?: string,
  options: { untracked?: boolean } = {}
): Promise<string | undefined> {
  if (!RESEND_API_KEY) {
    throw new Error("Email isn't set up yet — add RESEND_API_KEY to send customer emails.");
  }

  let identity: EmailIdentity | undefined;
  let contact: OrgContact | undefined;
  if (organizationId) {
    const [branding, c] = await Promise.all([getOrgBranding(organizationId), getOrgContact(organizationId)]);
    contact = c;
    identity = { businessName: branding.businessName, logoUrl: branding.logoUrl, color: branding.primaryColor, phone: c.phone };
  }

  // Defaults to the business's own inbox so replies never bounce (and never go
  // to someone else's); callers doing inbound-reply tracking (lead sequences)
  // pass a per-lead parseable address instead. See src/lib/leadSequences.ts.
  const effectiveReplyTo = replyTo ?? contact?.email ?? NOTIFICATION_EMAIL;

  // The sending address is the platform's, but the name people see is the
  // business's.
  const address = FROM_EMAIL.match(/<([^>]+)>/)?.[1] ?? FROM_EMAIL;
  const from = identity ? `${identity.businessName.replace(/["<>,]/g, "")} <${address}>` : FROM_EMAIL;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: body,
      html: wrapEmailHtml(body, identity),
      // FROM_EMAIL is a branded sending address with no real inbox behind
      // it — this makes a customer/lead's "Reply" land somewhere real
      // instead of bouncing.
      ...(effectiveReplyTo ? { reply_to: effectiveReplyTo } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend email failed:", detail);
    throw new Error("Failed to send the email — check the Resend setup.");
  }

  const result = await response.json().catch(() => null);
  const messageId = typeof result?.id === "string" ? result.id : undefined;

  if (messageId && organizationId && !options.untracked) {
    try {
      await db.emailDeliveryLog.create({
        data: { organizationId, resendMessageId: messageId, toEmail: to, subject, status: "sent" },
      });
    } catch (error) {
      // Tracking is best-effort — a logging hiccup shouldn't fail a send
      // that already succeeded.
      console.error("Failed to log email delivery tracking:", error);
    }
  }

  return messageId;
}
