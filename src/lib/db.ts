import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "@/generated/prisma";
import { ORG_SCOPED_MODELS, GUARDED_OPERATIONS, whereContainsOrganizationId } from "./tenantGuard";

// Deliberately created and used entirely within this one module — not
// imported elsewhere — because Next.js can bundle a shared module into
// more than one separate copy across different route entry points. Two
// copies of an AsyncLocalStorage instance don't see each other's state,
// which silently breaks an allow-listed query into "still blocked." Living
// only here, and only ever reached through db.$allowUnscoped below,
// sidesteps that entirely: every caller goes through the same db object.
const unscopedStorage = new AsyncLocalStorage<string>();

// A safety net on top of the manual per-query scoping done throughout the
// app: throws in development/production alike if code ever queries one of
// the organization-owned models (see tenantGuard.ts) without an
// organizationId in `where` — the exact mistake that would otherwise leak
// one business's data into another's silently. Call db.$allowUnscoped(...)
// for the rare deliberate exception (today, only the daily crons).
function withTenantGuard(client: PrismaClient) {
  return client.$extends({
    name: "tenantGuard",
    client: {
      $allowUnscoped<T>(reason: string, fn: () => Promise<T>): Promise<T> {
        if (!reason.trim()) throw new Error("$allowUnscoped requires a reason.");
        // Prisma's query methods are lazy (a PrismaPromise doesn't
        // actually dispatch until awaited/thenned), so `fn()`'s query
        // would otherwise fire after this AsyncLocalStorage frame has
        // already returned. Awaiting it right here, inside the run()
        // callback, keeps the query's dispatch — and therefore the
        // $allOperations hook below — inside the context where the store
        // is actually set.
        return unscopedStorage.run(reason, async () => await fn());
      },
    },
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            ORG_SCOPED_MODELS.has(model) &&
            GUARDED_OPERATIONS.has(operation) &&
            !unscopedStorage.getStore() &&
            !whereContainsOrganizationId((args as { where?: unknown }).where)
          ) {
            throw new Error(
              `Blocked unscoped ${operation} on ${model} — no organizationId found in "where". ` +
                `Add organizationId to the query, or if this genuinely needs to span every ` +
                `organization, wrap it in db.$allowUnscoped("reason", () => ...).`
            );
          }
          return query(args);
        },
      },
    },
  });
}

// Reuse one PrismaClient across hot-reloads in dev so we don't open a
// new database connection on every file save.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof withTenantGuard>;
};

export const db = globalForPrisma.prisma ?? withTenantGuard(new PrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
