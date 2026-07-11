"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { getAgreementSettings } from "@/lib/agreement";
import { fillBlankCustomerFields } from "@/lib/customerSync";
import { getPublicOrganizationId } from "@/lib/session";

export async function submitSignature(formData: FormData) {
  const name = str(formData, "name");
  const email = str(formData, "email");
  const phone = str(formData, "phone");
  const address = str(formData, "address");
  const agreed = formData.get("agreed") === "on";

  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (!phone) throw new Error("Phone is required");
  if (!address) throw new Error("Service address is required");
  if (!agreed) throw new Error("You must check the box to agree before submitting");

  const organizationId = await getPublicOrganizationId();
  const agreement = await getAgreementSettings(organizationId);

  let customer = await db.customer.findFirst({ where: { email, organizationId } });
  if (!customer) {
    customer = await db.customer.findFirst({ where: { phone, organizationId } });
  }
  if (!customer) {
    customer = await db.customer.create({ data: { organizationId, name, email, phone, address } });
  } else {
    await fillBlankCustomerFields(customer, { phone, email, address });
  }

  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  await db.signedAgreement.create({
    data: {
      agreementTitle: agreement.title,
      agreementText: agreement.content,
      signerName: name,
      signerEmail: email,
      signerPhone: phone,
      signerAddress: address,
      ipAddress,
      customerId: customer.id,
    },
  });

  redirect("/agreement/thank-you");
}
