import { existsSync } from "fs";
import path from "path";
import { Sidebar } from "@/components/Sidebar";
import { branding } from "@/lib/branding";
import { db } from "@/lib/db";

export default async function InternalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const logoExists = existsSync(
    path.join(process.cwd(), "public", branding.logoPath)
  );
  const pendingCount = await db.booking.count({ where: { status: "pending" } });

  return (
    <div className="flex min-h-full">
      <Sidebar logoExists={logoExists} pendingCount={pendingCount} />
      <main className="w-full flex-1 px-8 py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
