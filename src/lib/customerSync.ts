import { db } from "@/lib/db";

// Fills in any blank phone/email/address on an existing customer record
// using info from a freshly signed agreement, without overwriting anything
// already on file — so a differently-formatted resubmission never clobbers
// real data the customer already gave.
export async function fillBlankCustomerFields(
  customer: { id: string; phone: string | null; email: string | null; address: string | null },
  info: { phone?: string | null; email?: string | null; address?: string | null }
) {
  const data: { phone?: string; email?: string; address?: string } = {};
  if (!customer.phone && info.phone) data.phone = info.phone;
  if (!customer.email && info.email) data.email = info.email;
  if (!customer.address && info.address) data.address = info.address;
  if (Object.keys(data).length === 0) return;
  await db.customer.update({ where: { id: customer.id }, data });
}
