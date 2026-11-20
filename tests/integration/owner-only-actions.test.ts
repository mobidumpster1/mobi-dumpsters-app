import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The "who is logged in" cookie, controlled by the test.
let sessionToken = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "mobi_session" ? { value: sessionToken } : undefined) }),
  headers: async () => new Headers(),
}));
// The website builder pulls in next/font, which only works inside Next's build.
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "", style: {} });
  return {
    Archivo: font,
    Source_Sans_3: font,
    Playfair_Display: font,
    Space_Grotesk: font,
    Inter: font,
    Poppins: font,
    Nunito: font,
    Fraunces: font,
    Work_Sans: font,
    Bitter: font,
    Lora: font,
    Montserrat: font,
    Libre_Baskerville: font,
    JetBrains_Mono: font,
    DM_Sans: font,
  };
});
vi.mock("next/cache",() => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import { db } from "@/lib/db";
import { createSessionToken } from "@/lib/auth";
import * as settingsActions from "@/app/(internal)/settings/actions";
import * as apiKeyActions from "@/app/(internal)/settings/apiKeyActions";
import * as builderActions from "@/app/(internal)/website-builder/sectionActions";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// The pages hide Settings, API keys and the website builder from staff, but a
// server action can be called directly. Every one of them must refuse anyone
// who isn't the owner. Runs as a staff member of the Acme test business only.

let staffId = "";

beforeAll(async () => {
  const staff = await db.user.create({
    data: {
      name: "Staff Tester",
      email: `${testId("owner-only")}@example.test`,
      passwordHash: "not-a-real-hash",
      role: "staff",
      organizationId: ACME_ORG_ID,
      canManageInvoices: true,
      canViewReports: true,
      canManageLeads: true,
      canManageExpenses: true,
    },
  });
  staffId = staff.id;
  sessionToken = createSessionToken(staff.id);
});

afterAll(async () => {
  await db.auditLog.deleteMany({ where: { userId: staffId } });
  await db.user.delete({ where: { id: staffId } });
});

function actionsOf(mod: Record<string, unknown>) {
  return Object.entries(mod).filter(([, v]) => typeof v === "function") as [string, (...args: unknown[]) => Promise<unknown>][];
}

describe("owner-only server actions", () => {
  const modules: [string, Record<string, unknown>][] = [
    ["settings/actions", settingsActions],
    ["settings/apiKeyActions", apiKeyActions],
    ["website-builder/sectionActions", builderActions],
  ];

  it("found the actions to check", () => {
    for (const [, mod] of modules) expect(actionsOf(mod).length).toBeGreaterThan(0);
  });

  for (const [label, mod] of modules) {
    it(`${label}: every action refuses a staff member who has every other permission`, async () => {
      for (const [name, fn] of actionsOf(mod)) {
        await expect(fn(new FormData(), new FormData()), `${label}.${name} let a staff member through`).rejects.toThrow(
          /Only the owner/
        );
      }
    });
  }
});
