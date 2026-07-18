import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createQuote } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { QuoteLineItemsBuilder } from "@/components/QuoteLineItemsBuilder";
import { CustomerPicker } from "@/components/CustomerPicker";
import { hasPlan, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; customerId?: string }>;
}) {
  const user = await requireUser();
  if (!hasPlan(user, "team")) redirect("/");
  const { leadId, customerId } = await searchParams;

  const [lead, customer, customers, categories] = await Promise.all([
    leadId
      ? db.lead.findFirst({ where: { id: leadId, organizationId: user.effectiveOrganizationId } })
      : null,
    customerId
      ? db.customer.findFirst({
          where: { id: customerId, organizationId: user.effectiveOrganizationId },
        })
      : null,
    leadId || customerId
      ? []
      : db.customer.findMany({
          where: { organizationId: user.effectiveOrganizationId },
          orderBy: { name: "asc" },
        }),
    db.equipmentCategory.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (leadId && !lead) notFound();
  if (customerId && !customer) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">New Quote</h1>
      <form action={createQuote} className="mt-6 flex flex-col gap-4">
        {lead ? (
          <>
            <p className="text-sm text-zinc-500">
              For lead: <span className="font-medium text-zinc-900">{lead.name}</span>
            </p>
            <input type="hidden" name="leadId" value={lead.id} />
          </>
        ) : customer ? (
          <>
            <p className="text-sm text-zinc-500">
              For customer: <span className="font-medium text-zinc-900">{customer.name}</span>
            </p>
            <input type="hidden" name="customerId" value={customer.id} />
          </>
        ) : (
          <>
            <CustomerPicker customers={customers} />
            <p className="text-xs text-zinc-500">
              Quoting a new prospect who isn&apos;t a customer yet? Use{" "}
              <Link href="/leads" className="font-semibold text-brand hover:underline">
                Create Quote
              </Link>{" "}
              from their lead instead.
            </p>
          </>
        )}

        <QuoteLineItemsBuilder
          categoryOptions={categories.map((c) => ({
            id: c.id,
            name: c.name,
            basePrice: c.basePrice,
          }))}
        />

        <Field label="Proposed Date (optional)" htmlFor="proposedDate">
          <input id="proposedDate" name="proposedDate" type="date" className={inputClass} />
        </Field>

        <Field label="Notes" htmlFor="notes">
          <textarea id="notes" name="notes" rows={3} className={inputClass} />
        </Field>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Save Quote
          </button>
          <Link
            href="/quotes"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
