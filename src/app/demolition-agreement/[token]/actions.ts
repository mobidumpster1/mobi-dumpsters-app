"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { fillBlankCustomerFields } from "@/lib/customerSync";
import { sendNotificationEmail, siteOrigin } from "@/lib/email";

// Public, unauthenticated — reached from the link staff copy/paste or text
// to a customer. No session exists here, same "no user to log an action
// against" situation as the general /agreement/sign flow and Quote's
// public accept/decline.
export async function submitDemolitionSignature(publicToken: string, formData: FormData) {
  const agreement = await db.demolitionAgreement.findUnique({ where: { publicToken } });
  if (!agreement) throw new Error("This agreement link isn't valid.");
  if (agreement.status === "signed") {
    throw new Error("This agreement has already been signed.");
  }

  const customerName = str(formData, "customerName");
  const customerPhone = str(formData, "customerPhone");
  const customerEmail = str(formData, "customerEmail");
  const serviceAddress = str(formData, "serviceAddress");
  const serviceDateStr = str(formData, "serviceDate");
  const agreed = formData.get("agreed") === "on";

  if (!customerName) throw new Error("Full name is required");
  if (!customerPhone) throw new Error("Phone number is required");
  if (!customerEmail) throw new Error("Email address is required");
  if (!serviceAddress) throw new Error("Service address is required");
  if (!agreed) throw new Error("You must check the box to agree before submitting");

  let customer = agreement.customerId
    ? await db.customer.findUnique({ where: { id: agreement.customerId } })
    : null;
  if (!customer) {
    customer = await db.customer.findFirst({
      where: { email: customerEmail, organizationId: agreement.organizationId },
    });
  }
  if (!customer) {
    customer = await db.customer.findFirst({
      where: { phone: customerPhone, organizationId: agreement.organizationId },
    });
  }
  if (!customer) {
    customer = await db.customer.create({
      data: {
        organizationId: agreement.organizationId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: serviceAddress,
      },
    });
  } else {
    await fillBlankCustomerFields(customer, {
      phone: customerPhone,
      email: customerEmail,
      address: serviceAddress,
    });
  }

  const headerList = await headers();
  const signerIpAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  await db.demolitionAgreement.update({
    where: { id: agreement.id },
    data: {
      customerId: customer.id,
      customerName,
      customerPhone,
      customerEmail,
      serviceAddress,
      serviceDate: serviceDateStr ? new Date(serviceDateStr) : null,
      status: "signed",
      signedAt: new Date(),
      signerIpAddress,
    },
  });

  await sendNotificationEmail(
    `Demolition agreement signed — ${agreement.structureDescription}`,
    [
      `${customerName} signed the demolition agreement for ${agreement.propertyAddress}.`,
      "",
      `Structure: ${agreement.structureDescription}`,
      `Quoted price: $${agreement.quotedPrice.toFixed(2)}`,
      agreement.depositDue != null ? `Deposit due: $${agreement.depositDue.toFixed(2)}` : null,
      `Customer phone: ${customerPhone}`,
      `Customer email: ${customerEmail}`,
      "",
      `View the signed agreement: ${siteOrigin()}/demolition-agreements/${agreement.id}`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}
