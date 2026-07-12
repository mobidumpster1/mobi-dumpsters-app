import { getOrgBranding } from "@/lib/orgBranding";
import { getPublicOrganizationId } from "@/lib/session";

export default async function AgreementThankYouPage() {
  const branding = await getOrgBranding(await getPublicOrganizationId());

  return (
    <div className="theme-light flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Signed — thank you!</h1>
        <p className="mt-3 text-zinc-600">
          Your signature has been recorded. {branding.businessName} has a
          copy on file.
        </p>
      </div>
    </div>
  );
}
