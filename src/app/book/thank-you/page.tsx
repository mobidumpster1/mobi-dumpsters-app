import Link from "next/link";
import { db } from "@/lib/db";
import { getOrgBranding } from "@/lib/orgBranding";
import { getPublicOrganizationId } from "@/lib/session";
import { getStripeConnection, createSetupIntent } from "@/lib/stripe";
import { payBookingInvoiceNow } from "../actions";
import { SaveCardSection } from "../SaveCardSection";
import { EmbedAutoResize } from "@/components/EmbedAutoResize";
import { branding as staticBranding } from "@/lib/branding";
import { FONT_VARIABLES_CLASS } from "@/lib/websiteBuilderFonts";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; agreement?: string; invoice?: string; payError?: string; embed?: string; theme?: string }>;
}) {
  const { ref, agreement, invoice: invoiceId, payError, embed, theme: themeParam } = await searchParams;
  const isEmbed = embed === "1";
  const organizationId = await getPublicOrganizationId();
  const branding = await getOrgBranding(organizationId);
  const contact = { phone: staticBranding.smsPhone || staticBranding.phone };
  const isDark = themeParam === "dark" || (themeParam !== "light" && isEmbed);
  const phoneDigits = contact.phone?.replace(/\D/g, "");

  const [invoice, connection] = await Promise.all([
    // Scoped to this request's own organization — invoiceId comes straight
    // off the public query string, so an unscoped lookup would let anyone
    // holding (or guessing) any tenant's invoice ID read that tenant's
    // customer name/email/phone and invoice amount here.
    invoiceId
      ? db.invoice.findFirst({
          where: { id: invoiceId, organizationId },
          include: { booking: { include: { customer: true } }, customer: true },
        })
      : null,
    getStripeConnection(organizationId),
  ]);

  // Already paid (e.g. they hit back after paying, or clicked twice).
  const canPayNow = invoice && connection && invoice.status !== "paid";
  const payNowWithId = invoice ? payBookingInvoiceNow.bind(null, invoice.id) : null;

  const customer = invoice?.booking?.customer ?? invoice?.customer ?? null;
  const cardSetup =
    connection && invoice && customer && !customer.stripePaymentMethodId
      ? await createSetupIntent(organizationId, {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          stripeCustomerId: customer.stripeCustomerId,
        })
      : null;

  return (
    <div
      className={`${FONT_VARIABLES_CLASS} ${
        isDark ? (isEmbed ? "theme-embed" : "theme-public-dark") : "theme-booking"
      } ${isEmbed ? "flex items-center justify-center px-2 py-4" : "flex min-h-screen items-center justify-center bg-background px-4 py-8"}`}
      style={
        {
          "--rt-brand": branding.primaryColor,
          "--rt-brand-dark": branding.primaryColorDark,
          "--font-display-face": "var(--font-archivo)",
        } as React.CSSProperties
      }
    >
      {isEmbed && <EmbedAutoResize />}
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-[0_8px_30px_rgb(0_0_0/0.08)]">
        <div
          aria-hidden="true"
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-3xl font-extrabold text-accent-ink"
        >
          &#10003;
        </div>
        <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink">Request received!</h1>
        <p className="mt-3 text-zinc-600">
          Thanks for your request. {branding.businessName} will contact you
          shortly to confirm details.
        </p>
        {ref && <p className="mt-4 text-sm text-zinc-500">Reference #: {ref}</p>}

        <ol className="mt-6 flex flex-col gap-2 rounded-2xl bg-zinc-50 p-4 text-left text-sm text-zinc-600">
          <li className="font-bold text-ink">What happens next</li>
          {["We review your request and confirm by phone or text.", "We deliver on your day.", "We pick it up when your rental ends."].map((line, index) => (
            <li key={line} className="flex items-start gap-2.5">
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-extrabold text-brand-fg">
                {index + 1}
              </span>
              <span className="pt-0.5">{line}</span>
            </li>
          ))}
        </ol>
        {phoneDigits && phoneDigits.length >= 10 && (
          <a
            href={`tel:${phoneDigits}`}
            className="mt-3 flex min-h-11 items-center justify-center rounded-xl border-2 border-brand px-4 text-sm font-bold text-brand-fg transition-colors hover:bg-brand/10"
          >
            Questions? Call or text {contact.phone}
          </a>
        )}

        {invoice && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-left">
            <p className="text-sm font-semibold text-ink">
              Total: ${invoice.amount.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Pay online now, or pay when the job is done — whichever&apos;s
              easier. No action needed here if you&apos;d rather pay later.
            </p>

            {payError === "1" && (
              <p className="mt-3 text-xs font-medium text-red-600">
                Online payment isn&apos;t available right now — no worries,
                you can pay when the job&apos;s done instead.
              </p>
            )}

            {canPayNow && payNowWithId && (
              <form action={payNowWithId} className="mt-4">
                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-accent px-5 text-base font-extrabold text-accent-ink transition-all hover:brightness-105"
                >
                  Pay ${invoice.amount.toFixed(2)} Now
                </button>
              </form>
            )}

            {cardSetup && (
              <div className="mt-4 border-t border-zinc-200 pt-4">
                <p className="text-xs font-medium text-zinc-500">
                  Or just save a card for when the job&apos;s done — no
                  charge now.
                </p>
                <div className="mt-2">
                  <SaveCardSection
                    invoiceId={invoice.id}
                    clientSecret={cardSetup.clientSecret}
                    publishableKey={cardSetup.publishableKey}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {agreement && (
          <Link
            href={`/agreement/view/${agreement}`}
            className="mt-6 inline-block rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            View Your Order &amp; Signed Agreement
          </Link>
        )}
      </div>
    </div>
  );
}
