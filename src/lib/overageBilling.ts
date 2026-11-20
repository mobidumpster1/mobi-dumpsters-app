import "server-only";
import { db } from "@/lib/db";
import { getTaxSettings } from "@/lib/taxSettings";
import { getOrgContact } from "@/lib/orgContact";
import { primaryInvoiceWhere } from "@/lib/invoicing";
import { sendCustomerSms } from "@/lib/twilio";

// Overage billing (extra tons, extra miles). Plain library code, deliberately
// NOT in a "use server" file: these functions take an organizationId as an
// argument, so they must never be reachable as public server actions.

// The scale receipt (and so the real weight) only exists once the load's
// already been dumped — well after "Mark Returned," which is the only
// place actualTonnage could otherwise be entered. Without this, actualTonnage
// stays null forever and invoicing.ts's overage-tonnage charge never fires.
// Only auto-applies when exactly one of this booking's items has been
// returned but has no weight yet — with zero or more than one candidate
// there's no safe way to guess which item a given scale receipt belongs
// to, so the entry is still logged, just not synced to billing or checked
// for overage (a staff member can still read the weight off the Dump Log
// and handle that booking's invoice manually).
//
// Public checkout creates the invoice at booking time and
// createDraftInvoiceForBooking never recomputes an existing one, so
// recording the weight alone changes nothing on the invoice — the overage
// line is added to it here. That's only done while the invoice is still
// plain "unpaid" with no installment plan; a paid, partly-paid or
// installment invoice is left alone (changing what was already collected
// against would leave it inconsistent) and a note is left on the customer
// for staff to bill by hand. The customer is only texted when the charge
// really is on their invoice.
export async function applyDumpWeightToBooking(
  organizationId: string,
  customer: { id: string; name: string; phone: string | null },
  bookingId: string,
  weightTons: number,
  // When a booking has several returned-but-unweighed items, the person
  // entering the weight can say which one the scale ticket belongs to.
  itemId?: string
) {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, organizationId },
    include: { items: { include: { equipmentItem: { include: { category: true } } } } },
  });
  if (!booking || booking.customerId !== customer.id) return;

  const unweighedReturnedItems = booking.items.filter(
    (item) =>
      item.actualReturnDate !== null && item.actualTonnage === null && (!itemId || item.id === itemId)
  );
  if (unweighedReturnedItems.length !== 1) return;
  const item = unweighedReturnedItems[0];

  await db.bookingItem.update({
    where: { id: item.id },
    data: { actualTonnage: weightTons },
  });

  await billTonnageOverage(organizationId, customer, bookingId, item, weightTons);
}

type OverageItem = {
  id: string;
  equipmentItem: {
    label: string;
    category: {
      includedTonnage: number | null;
      overageTonnageRate: number | null;
      includedMileage: number | null;
      overageMileageRate: number | null;
    };
  };
};

type OverageLine = {
  type: "overage_tonnage" | "overage_mileage";
  // The invoice line description starts with the unit's label, which is how a
  // line already billed for this unit is recognised (no double billing).
  unitLabel: string;
  description: string;
  fee: number;
};

// Puts one overage charge (extra tons or extra miles) on a booking's invoice
// and says what happened:
//   "billed"  - it's on the invoice (added now, already there, or the invoice
//               doesn't exist yet and will be computed from the recorded
//               weight/miles when it's created);
//   "manual"  - the invoice is paid, partly paid or on an installment plan, so
//               nothing was changed (altering what was already collected
//               against would leave it inconsistent). A note is left on the
//               customer for staff to bill by hand.
async function addOverageToInvoice(
  organizationId: string,
  customerId: string,
  bookingId: string,
  line: OverageLine
): Promise<"billed" | "manual"> {
  const invoice = await db.invoice.findFirst({
    where: primaryInvoiceWhere(organizationId, bookingId),
    orderBy: { createdAt: "asc" },
    include: { lineItems: true, installments: true },
  });

  // Not invoiced yet: the line is computed from the recorded value when it is.
  if (!invoice) return "billed";
  if (invoice.lineItems.some((l) => l.type === line.type && l.description.startsWith(line.unitLabel))) return "billed";

  if (invoice.status === "unpaid" && invoice.installments.length === 0) {
    const taxSettings = await getTaxSettings(organizationId);
    const taxLine = invoice.lineItems.find((l) => l.type === "tax");
    const taxDelta =
      taxLine && taxSettings.enabled && taxSettings.ratePercent > 0 ? line.fee * (taxSettings.ratePercent / 100) : 0;

    await db.$transaction(async (tx) => {
      await tx.invoiceLineItem.create({
        data: { invoiceId: invoice.id, description: line.description, amount: line.fee, type: line.type },
      });
      if (taxLine && taxDelta > 0) {
        await tx.invoiceLineItem.update({ where: { id: taxLine.id }, data: { amount: { increment: taxDelta } } });
      }
      await tx.invoice.update({ where: { id: invoice.id }, data: { amount: { increment: line.fee + taxDelta } } });
    });
    return "billed";
  }

  await db.customerNote.create({
    data: {
      customerId,
      type: "note",
      content: `${line.description} ($${line.fee.toFixed(2)}) is owed, but invoice ${invoice.invoiceNumber} is already ${
        invoice.status === "unpaid" ? "on an installment plan" : invoice.status
      }, so the charge was NOT added automatically. Bill it manually. The customer was not texted.`,
    },
  });
  return "manual";
}

// Extra tons over what the rental includes, billed onto the invoice, and the
// customer told by text when the charge really is on their invoice. Used both
// by the dump-log weight entry and by the weight typed on the pickup form, so
// the two can't disagree.
export async function billTonnageOverage(
  organizationId: string,
  customer: { id: string; name: string; phone: string | null },
  bookingId: string,
  item: OverageItem,
  weightTons: number
) {
  const category = item.equipmentItem.category;
  if (category.includedTonnage === null || category.overageTonnageRate === null) return;
  const extraTons = Math.max(0, weightTons - category.includedTonnage);
  if (extraTons <= 0) return;

  const overageFee = extraTons * category.overageTonnageRate;
  const description = `${item.equipmentItem.label} — Extra Tonnage (${extraTons.toFixed(2)} tons × $${category.overageTonnageRate.toFixed(2)})`;

  const outcome = await addOverageToInvoice(organizationId, customer.id, bookingId, {
    type: "overage_tonnage",
    unitLabel: item.equipmentItem.label,
    description,
    fee: overageFee,
  });
  if (outcome === "manual") return;

  const contactPhone = (await getOrgContact(organizationId)).phone;
  const body = `Hi ${customer.name}, heads up — your rental came in at ${weightTons.toFixed(2)} tons, which is ${extraTons.toFixed(2)} tons over the ${category.includedTonnage.toFixed(2)} tons included. A $${overageFee.toFixed(2)} overage charge has been added to your invoice.${contactPhone ? ` Questions? Call or text us at ${contactPhone}.` : ""}`;

  // Best-effort: Twilio not connected yet, or no phone on file, just means
  // no text goes out; the weight is still correctly applied to the booking
  // either way, so billing isn't held hostage by texting being set up.
  try {
    await sendCustomerSms(organizationId, { id: customer.id, phone: customer.phone }, body);
  } catch (err) {
    console.error("Failed to send overweight notice:", err);
  }
}

// Extra miles over what the rental includes, billed onto the invoice the same
// way. No text: mileage isn't something the customer is told about as it
// happens.
export async function billMileageOverage(
  organizationId: string,
  customerId: string,
  bookingId: string,
  item: OverageItem,
  miles: number
) {
  const category = item.equipmentItem.category;
  if (category.includedMileage === null || category.overageMileageRate === null) return;
  const extraMiles = Math.max(0, miles - category.includedMileage);
  if (extraMiles <= 0) return;

  await addOverageToInvoice(organizationId, customerId, bookingId, {
    type: "overage_mileage",
    unitLabel: item.equipmentItem.label,
    description: `${item.equipmentItem.label} — Extra Mileage (${extraMiles.toFixed(1)} mi × $${category.overageMileageRate.toFixed(2)})`,
    fee: extraMiles * category.overageMileageRate,
  });
}

