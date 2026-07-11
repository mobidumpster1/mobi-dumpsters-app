import { PrismaClient } from "../src/generated/prisma";
import type { FieldDefinition } from "../src/lib/categoryFields";

const db = new PrismaClient();

const dumpsterFields: FieldDefinition[] = [
  { key: "sizeYards", label: "Size (yd)", type: "number", unit: "yd", required: true },
  { key: "maxWeightTons", label: "Max Weight", type: "number", unit: "tons" },
  { key: "materialRestrictions", label: "Material Restrictions", type: "text" },
];

const trailerFields: FieldDefinition[] = [
  { key: "sizeYards", label: "Size (yd)", type: "number", unit: "yd", required: true },
  { key: "maxWeightTons", label: "Max Weight", type: "number", unit: "tons" },
];

async function main() {
  const organization = await db.organization.findFirstOrThrow();

  const dumpsterCategory = await db.equipmentCategory.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: "Roll-Off Dumpster" } },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Roll-Off Dumpster",
      description: "Roll-off dumpsters for junk removal and demolition debris.",
      fieldDefinitions: JSON.stringify(dumpsterFields),
    },
  });

  const trailerCategory = await db.equipmentCategory.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: "Dump Trailer" } },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Dump Trailer",
      description: "Towable dump trailers.",
      fieldDefinitions: JSON.stringify(trailerFields),
    },
  });

  const items: {
    categoryId: string;
    label: string;
    attributes: Record<string, unknown>;
  }[] = [
    {
      categoryId: dumpsterCategory.id,
      label: "Dumpster #1",
      attributes: { sizeYards: 20, maxWeightTons: 3 },
    },
    {
      categoryId: dumpsterCategory.id,
      label: "Dumpster #2",
      attributes: { sizeYards: 20, maxWeightTons: 3 },
    },
    {
      categoryId: trailerCategory.id,
      label: "Dump Trailer #1",
      attributes: { sizeYards: 10, maxWeightTons: 2 },
    },
  ];

  for (const item of items) {
    const existing = await db.equipmentItem.findFirst({
      where: { label: item.label },
    });
    if (!existing) {
      await db.equipmentItem.create({
        data: {
          organizationId: organization.id,
          categoryId: item.categoryId,
          label: item.label,
          status: "available",
          attributes: JSON.stringify(item.attributes),
        },
      });
    }
  }

  console.log("Seed complete: 2 categories, fleet of 3 items ensured.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
