// One-time migration: collapses the old two-editor WebsiteBuilderPage
// shape (canvasWidth/canvasHeight/blocksJson/builderMode + sectionsJson,
// two independent drafts sharing a row) into the new unified shape (one
// sectionsJson, where free-position content is a "freeCanvas" section
// instead of a parallel page). See the plan file / project memory for
// the four-bucket classification this implements.
//
// SAFE BY DEFAULT: run with no flags and this only reads and prints a
// report — it never writes. Pass --write to actually perform the
// migration. Always run without --write first and read the report
// before ever passing it.
//
//   npx tsx scripts/migrateBuilderPages.ts             (dry run, default)
//   npx tsx scripts/migrateBuilderPages.ts --write      (writes for real)

import { PrismaClient } from "../src/generated/prisma";
import { parseBlocks, type Block } from "../src/lib/websiteBuilder";
import {
  parseSections,
  serializeSections,
  createFreeCanvasSection,
  type SectionInstance,
} from "../src/lib/websiteSections";

const db = new PrismaClient();
const WRITE = process.argv.includes("--write");
const MAX_VERSIONS = 10;

type Bucket = "A: canvas only" | "B: sections only" | "C: both saved" | "D: empty";

function classify(hasCanvas: boolean, hasSections: boolean): Bucket {
  if (hasCanvas && hasSections) return "C: both saved";
  if (hasCanvas) return "A: canvas only";
  if (hasSections) return "B: sections only";
  return "D: empty";
}

async function pruneVersions(organizationId: string) {
  const stale = await db.websiteBuilderPageVersion.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    skip: MAX_VERSIONS,
    select: { id: true },
  });
  if (stale.length > 0) {
    await db.websiteBuilderPageVersion.deleteMany({ where: { organizationId, id: { in: stale.map((v) => v.id) } } });
  }
}

async function main() {
  const pages = await db.websiteBuilderPage.findMany({
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\nFound ${pages.length} WebsiteBuilderPage row(s). Mode: ${WRITE ? "WRITE (real migration)" : "DRY RUN (read-only)"}\n`);

  const tally: Record<Bucket, number> = {
    "A: canvas only": 0,
    "B: sections only": 0,
    "C: both saved": 0,
    "D: empty": 0,
  };

  for (const page of pages) {
    const canvasBlocks = parseBlocks(page.blocksJson);
    const existingSections = parseSections(page.sectionsJson);
    const hasCanvas = canvasBlocks.length > 0;
    const hasSections = existingSections.length > 0;
    const bucket = classify(hasCanvas, hasSections);
    tally[bucket]++;

    const freeCanvasFromBlocks = (blocks: Block[]) =>
      createFreeCanvasSection(blocks, page.canvasWidth, page.canvasHeight);

    let newSections: SectionInstance[];
    let archiveLabel: string | null = null;
    let archiveSectionsJson: string | null = null;

    switch (bucket) {
      case "A: canvas only":
        newSections = [freeCanvasFromBlocks(canvasBlocks)];
        break;
      case "B: sections only":
        newSections = existingSections;
        break;
      case "D: empty":
        newSections = [];
        break;
      case "C: both saved": {
        const canvasAsSections: SectionInstance[] = [freeCanvasFromBlocks(canvasBlocks)];
        if (page.builderMode === "canvas") {
          newSections = canvasAsSections;
          archiveLabel = `Sections draft (archived by unified-page migration, ${new Date().toISOString().slice(0, 10)})`;
          archiveSectionsJson = serializeSections(existingSections);
        } else {
          newSections = existingSections;
          archiveLabel = `Canvas draft (archived by unified-page migration, ${new Date().toISOString().slice(0, 10)})`;
          archiveSectionsJson = serializeSections(canvasAsSections);
        }
        break;
      }
    }

    console.log(`— ${page.organization.name} (${page.organizationId})`);
    console.log(`  bucket: ${bucket}`);
    console.log(
      `  before: canvas ${canvasBlocks.length} block(s) [${page.canvasWidth}x${page.canvasHeight}, mode=${page.builderMode}], sections ${existingSections.length}, published=${page.published}`
    );
    console.log(`  after:  sections ${newSections.length} (${newSections.map((s) => s.type).join(", ") || "none"}), published=${page.published}`);
    if (archiveLabel) console.log(`  archives: "${archiveLabel}"`);

    if (WRITE) {
      await db.$transaction(async (tx) => {
        await tx.websiteBuilderPage.update({
          where: { id: page.id },
          data: { sectionsJson: serializeSections(newSections) },
        });
        if (archiveLabel && archiveSectionsJson) {
          await tx.websiteBuilderPageVersion.create({
            data: { organizationId: page.organizationId, label: archiveLabel, sectionsJson: archiveSectionsJson },
          });
        }
      });
      if (archiveLabel) await pruneVersions(page.organizationId);
      console.log("  ✓ written");
    }
    console.log("");
  }

  console.log("Summary:");
  for (const [bucket, count] of Object.entries(tally)) {
    console.log(`  ${bucket}: ${count}`);
  }
  console.log(
    WRITE
      ? "\nMigration complete."
      : "\nThis was a dry run — nothing was written. Re-run with --write to perform the migration for real."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
