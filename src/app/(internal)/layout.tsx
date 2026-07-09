import { existsSync } from "fs";
import path from "path";
import { Sidebar } from "@/components/Sidebar";
import { branding } from "@/lib/branding";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function InternalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const logoExists = existsSync(
    path.join(process.cwd(), "public", branding.logoPath)
  );
  const pendingCount = await db.booking.count({ where: { status: "pending" } });

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <Sidebar logoExists={logoExists} pendingCount={pendingCount} user={user} />
      <main className="w-full min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
