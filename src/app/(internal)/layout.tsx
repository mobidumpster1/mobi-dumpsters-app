import { existsSync } from "fs";
import path from "path";
import { Sidebar } from "@/components/Sidebar";
import { branding } from "@/lib/branding";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { stopImpersonation } from "@/app/(internal)/platform-admin/actions";

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
        <div className="mx-auto w-full max-w-6xl">
          {user.impersonating && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900">
              <span>
                Viewing as <strong>{user.impersonating.name}</strong> for support purposes. This
                ends automatically in a few hours.
              </span>
              <form action={stopImpersonation}>
                <button
                  type="submit"
                  className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Stop Viewing As
                </button>
              </form>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
