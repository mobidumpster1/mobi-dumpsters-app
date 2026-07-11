import { getAgreementSettings } from "@/lib/agreement";
import { branding } from "@/lib/branding";
import { Field, inputClass } from "@/components/Field";
import { submitSignature } from "./actions";
import { getPublicOrganizationId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SignAgreementPage() {
  const organizationId = await getPublicOrganizationId();
  const agreement = await getAgreementSettings(organizationId);

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {branding.businessName}
          </h1>
          <p className="mt-1 text-zinc-600">{agreement.title}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
            {agreement.content}
          </div>

          <form action={submitSignature} className="mt-6 flex flex-col gap-4">
            <Field label="Full Legal Name" htmlFor="name">
              <input id="name" name="name" required className={inputClass} />
            </Field>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Service Address" htmlFor="address">
              <input
                id="address"
                name="address"
                required
                className={inputClass}
              />
            </Field>

            <label className="flex items-start gap-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="agreed"
                required
                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-zinc-300"
              />
              I have read and agree to the terms above. Typing my name and
              checking this box serves as my electronic signature.
            </label>

            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Sign Agreement
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
