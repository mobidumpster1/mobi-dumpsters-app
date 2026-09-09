"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { parseCsv, csvColumnReader } from "@/lib/csv";
import { normalizeTagsInput } from "@/lib/tags";
import { requireUser } from "@/lib/session";

export async function importCustomersFromCsv(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A CSV file is required.");
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    throw new Error("The CSV needs a header row and at least one data row.");
  }
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => h.trim().toLowerCase());
  if (!headers.includes("name")) {
    throw new Error('The CSV needs a "Name" column.');
  }

  let created = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const col = csvColumnReader(headerRow, row);
    const name = col("name");
    if (!name) {
      skipped++;
      continue;
    }
    await db.customer.create({
      data: {
        organizationId: user.effectiveOrganizationId,
        name,
        companyName: col("company") ?? null,
        phone: col("phone") ?? null,
        email: col("email") ?? null,
        address: col("address") ?? null,
        notes: col("notes") ?? null,
        tags: normalizeTagsInput(col("tags") ?? ""),
      },
    });
    created++;
  }

  redirect(`/customers?imported=${created}&skipped=${skipped}`);
}
