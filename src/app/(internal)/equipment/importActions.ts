"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { parseCsv, csvColumnReader } from "@/lib/csv";
import { requireUser } from "@/lib/session";

// Category is matched by name (case-insensitive) against existing rental
// types rather than auto-creating one from a typo'd CSV cell — a row
// whose category doesn't already exist is skipped and counted, not
// silently given a garbage new category.
export async function importEquipmentFromCsv(formData: FormData) {
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
  if (!headers.includes("label") || !headers.includes("category")) {
    throw new Error('The CSV needs "Label" and "Category" columns.');
  }

  const categories = await db.equipmentCategory.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    select: { id: true, name: true },
  });
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  let created = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const col = csvColumnReader(headerRow, row);
    const label = col("label");
    const categoryName = col("category");
    const categoryId = categoryName ? categoryByName.get(categoryName.toLowerCase()) : undefined;
    if (!label || !categoryId) {
      skipped++;
      continue;
    }
    await db.equipmentItem.create({
      data: {
        organizationId: user.effectiveOrganizationId,
        categoryId,
        label,
        assetTag: col("asset tag") ?? null,
        currentLocation: col("current location") ?? null,
        notes: col("notes") ?? null,
        status: "available",
      },
    });
    created++;
  }

  redirect(`/equipment?imported=${created}&skipped=${skipped}`);
}
