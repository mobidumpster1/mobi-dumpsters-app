import { branding } from "@/lib/branding";

export const metadata = {
  title: `Terms of Service — ${branding.businessName}`,
};

export default function TermsOfServicePage() {
  const contactLine = [branding.email, branding.phone].filter(Boolean).join(" · ");

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-ink">Terms of Service</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {branding.businessName} — last updated {new Date().toLocaleDateString()}
          </p>

          <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-zinc-700">
            <p>
              This app is used by {branding.businessName} to manage bookings,
              equipment, invoicing, and customer communication for our
              dumpster rental, junk removal, and demolition services. By
              requesting a quote, booking equipment, or signing a service
              agreement through this app, you agree to these terms.
            </p>

            <h2 className="mt-2 text-base font-semibold text-ink">Service Agreements</h2>
            <p>
              The specific terms of a rental or job — including pricing,
              rental period, weight/overage limits, and liability terms —
              are governed by the separate service agreement you sign for
              that job, not by this page.
            </p>

            <h2 className="mt-2 text-base font-semibold text-ink">Use of This App</h2>
            <p>
              This app is provided to help you request, schedule, and pay for
              services with {branding.businessName}. Booking requests are
              subject to confirmation and availability. We may update or
              change how this app works at any time.
            </p>

            <h2 className="mt-2 text-base font-semibold text-ink">Payments</h2>
            <p>
              Where online payment is offered, payments are processed through
              QuickBooks Payments. We do not store your card or bank details
              ourselves.
            </p>

            <h2 className="mt-2 text-base font-semibold text-ink">Contact Us</h2>
            <p>
              Questions about these terms? Contact us
              {contactLine ? ` at ${contactLine}` : ""}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
