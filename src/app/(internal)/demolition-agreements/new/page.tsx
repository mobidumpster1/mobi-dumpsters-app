import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { DemolitionAgreementForm } from "../DemolitionAgreementForm";
import { createDemolitionAgreement } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewDemolitionAgreementPage() {
  const user = await requireUser();
  const customers = await db.customer.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">New Demolition Agreement</h1>
      <p className="mt-1 text-zinc-500">
        Fill in the project and pricing details below, then save — you&apos;ll get a
        shareable link to send the customer so they can fill in their info and sign.
      </p>
      <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
        <DemolitionAgreementForm
          action={createDemolitionAgreement}
          customers={customers}
          submitLabel="Save & Get Signing Link"
          cancelHref="/demolition-agreements"
        />
      </div>
    </div>
  );
}
