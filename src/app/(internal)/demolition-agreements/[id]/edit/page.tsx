import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { DemolitionAgreementForm } from "../../DemolitionAgreementForm";
import { updateDemolitionAgreement } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditDemolitionAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [agreement, customers] = await Promise.all([
    db.demolitionAgreement.findFirst({
      where: { id, organizationId: user.effectiveOrganizationId },
    }),
    db.customer.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!agreement) notFound();
  if (agreement.status === "signed") redirect(`/demolition-agreements/${id}`);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">Edit Demolition Agreement</h1>
      <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
        <DemolitionAgreementForm
          action={updateDemolitionAgreement.bind(null, agreement.id)}
          customers={customers}
          initial={{
            customerId: agreement.customerId,
            structureDescription: agreement.structureDescription,
            propertyAddress: agreement.propertyAddress,
            dimensions: agreement.dimensions,
            foundationRemovalIncluded: agreement.foundationRemovalIncluded,
            quotedPrice: agreement.quotedPrice,
            depositDue: agreement.depositDue,
            balanceDue: agreement.balanceDue,
          }}
          submitLabel="Save Changes"
          cancelHref={`/demolition-agreements/${id}`}
        />
      </div>
    </div>
  );
}
