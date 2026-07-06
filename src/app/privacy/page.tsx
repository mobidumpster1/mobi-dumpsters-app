import { branding } from "@/lib/branding";

export const metadata = {
  title: `Privacy Policy — ${branding.businessName}`,
};

export default function PrivacyPolicyPage() {
  const contactLine = [branding.email, branding.phone].filter(Boolean).join(" · ");

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-ink">Privacy Policy</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {branding.businessName} — last updated {new Date().toLocaleDateString()}
          </p>

          <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-zinc-700">
            <p>
              This policy explains what information {branding.businessName} collects
              when you request a quote, book a rental, or otherwise use our
              services, and how we use it.
            </p>

            <h2 className="mt-2 text-base font-semibold text-ink">Information We Collect</h2>
            <p>
              When you request service or book equipment with us, we collect your
              name, phone number, email address, service address, and details
              about the job (equipment requested, dates, photos of the job site
              or delivered equipment, and payment/invoice records).
            </p>

            <h2 className="mt-2 text-base font-semibold text-ink">How We Use It</h2>
            <p>
              We use this information to schedule and deliver your rental or
              service, send you updates (such as delivery notifications and
              invoices), process payments, and maintain our own business
              records (accounting, scheduling, and customer history).
            </p>

            <h2 className="mt-2 text-base font-semibold text-ink">Sharing</h2>
            <p>
              We share information with the service providers that help us run
              our business, and only as needed to provide our services:
              QuickBooks (accounting and invoicing), Google (maps and
              calendar scheduling), and our email provider (sending you
              booking and payment notifications). We do not sell your
              information to anyone.
            </p>

            <h2 className="mt-2 text-base font-semibold text-ink">Data Retention</h2>
            <p>
              We keep customer and job records for as long as needed for our
              business and tax records, consistent with standard recordkeeping
              practices.
            </p>

            <h2 className="mt-2 text-base font-semibold text-ink">Contact Us</h2>
            <p>
              If you have questions about this policy or want to request that
              we delete your information, contact us
              {contactLine ? ` at ${contactLine}` : ""}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
