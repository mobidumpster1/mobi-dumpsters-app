import { PrismaClient } from "@/generated/prisma";

// Reuse one PrismaClient across hot-reloads in dev so we don't open a
// new database connection on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
