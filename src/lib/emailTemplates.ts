import { db } from "@/lib/db";

export type EmailTemplateKey =
  | "on_my_way"
  | "delivered"
  | "picked_up"
  | "delivery_reminder"
  | "review_request"
  | "invoice_reminder"
  | "booking_confirmation";

export const EMAIL_TEMPLATE_INFO: Record<
  EmailTemplateKey,
  { label: string; description: string; placeholders: string[] }
> = {
  on_my_way: {
    label: "On My Way",
    description: "Sent when staff clicks the \"On My Way\" button on a booking.",
    placeholders: ["customerName", "address", "phone", "businessName"],
  },
  delivered: {
    label: "Delivery Confirmation",
    description:
      "Sent automatically when equipment is marked delivered. {{manageLink}} is a link where the customer can request an extension or a dump & return.",
    placeholders: ["customerName", "equipmentLabel", "address", "phone", "businessName", "manageLink"],
  },
  picked_up: {
    label: "Pickup Confirmation",
    description:
      "Sent automatically when equipment is marked returned. {{weightLine}} fills in the dump weight automatically when one was recorded, and is blank otherwise.",
    placeholders: ["customerName", "equipmentLabel", "address", "weightLine", "businessName"],
  },
  delivery_reminder: {
    label: "24-Hour Delivery Reminder",
    description: "Sent the day before a scheduled delivery.",
    placeholders: ["customerName", "equipmentLabel", "address", "phone", "businessName"],
  },
  review_request: {
    label: "Review Request",
    description: "Sent a few days after a job is picked up, asking for a Google review.",
    placeholders: ["customerName", "businessName", "reviewUrl"],
  },
  invoice_reminder: {
    label: "Overdue Invoice Reminder",
    description: "Sent when an invoice is past due.",
    placeholders: ["customerName", "invoiceNumber", "amount", "daysOverdue", "businessName"],
  },
  booking_confirmation: {
    label: "Booking Request Confirmation",
    description:
      "Sent to a customer right after they submit a request on the public booking page. {{agreementLine}} fills in a link to the agreement they signed.",
    placeholders: [
      "customerName",
      "categoryAndTier",
      "startDate",
      "endDate",
      "address",
      "agreementLine",
      "phone",
      "businessName",
    ],
  },
};

export const DEFAULT_EMAIL_TEMPLATES: Record<
  EmailTemplateKey,
  { subject: string; body: string }
> = {
  on_my_way: {
    subject: "{{businessName}} is on the way!",
    body: [
      "Hi {{customerName}},",
      "",
      "We're on our way to {{address}}.",
      "",
      "Questions? Call or text us at {{phone}}.",
      "",
      "- {{businessName}}",
    ].join("\n"),
  },
  delivered: {
    subject: "{{businessName}} — delivered!",
    body: [
      "Hi {{customerName}},",
      "",
      "Your {{equipmentLabel}} has been delivered to {{address}}.",
      "",
      "Need more time, or want it emptied and brought back instead of picked up? Manage your rental here: {{manageLink}}",
      "",
      "Questions? Call or text us at {{phone}}.",
      "",
      "- {{businessName}}",
    ].join("\n"),
  },
  picked_up: {
    subject: "{{businessName}} — picked up!",
    body: [
      "Hi {{customerName}},",
      "",
      "We've picked up your {{equipmentLabel}} from {{address}}.",
      "{{weightLine}}",
      "Thanks for choosing {{businessName}}!",
    ].join("\n"),
  },
  delivery_reminder: {
    subject: "Reminder: {{businessName}} delivery coming up",
    body: [
      "Hi {{customerName}},",
      "",
      "Just a heads-up that we'll be delivering your {{equipmentLabel}} to {{address}} soon.",
      "",
      "Questions? Call or text us at {{phone}}.",
      "",
      "- {{businessName}}",
    ].join("\n"),
  },
  review_request: {
    subject: "How did we do, {{customerName}}?",
    body: [
      "Hi {{customerName}},",
      "",
      "Thanks for choosing {{businessName}} for your recent job. If you have a minute, a quick Google review would mean a lot to us and helps other folks in the area find us.",
      "",
      "{{reviewUrl}}",
      "",
      "Thanks again,",
      "- {{businessName}}",
    ].join("\n"),
  },
  invoice_reminder: {
    subject: "Reminder: Invoice {{invoiceNumber}} is past due",
    body: [
      "Hi {{customerName}},",
      "",
      "This is a friendly reminder that invoice {{invoiceNumber}} for ${{amount}} is now {{daysOverdue}} past due.",
      "",
      "Let us know if you have questions or need to arrange payment.",
      "",
      "Thanks,",
      "- {{businessName}}",
    ].join("\n"),
  },
  booking_confirmation: {
    subject: "{{businessName}} — we got your request!",
    body: [
      "Hi {{customerName}},",
      "",
      "We received your request for a {{categoryAndTier}}, {{startDate}} through {{endDate}}, at {{address}}.",
      "",
      "This is a request, not a confirmed booking yet — we'll be in touch shortly to confirm the details and payment.",
      "{{agreementLine}}",
      "Questions? Call or text us at {{phone}}.",
      "",
      "- {{businessName}}",
    ].join("\n"),
  },
};

function render(template: string, variables: Record<string, string>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) =>
    key in variables ? variables[key] : match
  );
}

// Fetches the effective subject/body for a template key — the customized
// version from the database if one exists, otherwise the hardcoded default
// — and fills in {{placeholders}} with the given variables.
export async function renderEmailTemplate(
  key: EmailTemplateKey,
  variables: Record<string, string>,
  organizationId: string
): Promise<{ subject: string; body: string }> {
  const stored = await db.emailTemplate.findUnique({
    where: { organizationId_key: { organizationId, key } },
  });
  const template = stored ?? DEFAULT_EMAIL_TEMPLATES[key];
  return {
    subject: render(template.subject, variables),
    body: render(template.body, variables),
  };
}

export async function getAllEmailTemplates(organizationId: string) {
  const stored = await db.emailTemplate.findMany({ where: { organizationId } });
  const byKey = new Map(stored.map((t) => [t.key, t]));
  return (Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateKey[]).map((key) => {
    const custom = byKey.get(key);
    return {
      key,
      ...EMAIL_TEMPLATE_INFO[key],
      subject: custom?.subject ?? DEFAULT_EMAIL_TEMPLATES[key].subject,
      body: custom?.body ?? DEFAULT_EMAIL_TEMPLATES[key].body,
      isCustomized: Boolean(custom),
    };
  });
}

export async function updateEmailTemplate(
  key: EmailTemplateKey,
  subject: string,
  body: string,
  organizationId: string
) {
  await db.emailTemplate.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, subject, body },
    update: { subject, body },
  });
}

export async function resetEmailTemplate(key: EmailTemplateKey, organizationId: string) {
  await db.emailTemplate.deleteMany({ where: { organizationId, key } });
}
