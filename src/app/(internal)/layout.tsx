import { redirect } from "next/navigation";
import { Archivo } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { HubTabs } from "@/components/HubTabs";
import { entriesForUser } from "@/lib/navigation";
import { UnsavedChangesProvider } from "@/components/UnsavedChangesProvider";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getOrgBranding } from "@/lib/orgBranding";
import { stopImpersonation } from "@/app/(internal)/platform-admin/actions";
import { resendVerificationEmailAction } from "@/app/(internal)/verificationActions";

// Headline face for the admin app (page titles and section headings) — one
// self-hosted font, not the whole website-builder set.
const displayFont = Archivo({ subsets: ["latin"], variable: "--font-display-face" });

export default async function InternalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  // /driver lives in its own top-level route (src/app/driver), never
  // under this layout — so this redirect is unconditional and can't loop:
  // every page this layout wraps is exactly the "everything else" a
  // driver-only account shouldn't reach.
  if (user.isDriverOnly) redirect("/driver");
  const navEntries = entriesForUser(user);
  const orgBranding = await getOrgBranding(user.effectiveOrganizationId);
  const pendingCount = await db.booking.count({
    where: { status: "pending", organizationId: user.effectiveOrganizationId },
  });

  return (
    <UnsavedChangesProvider>
      <div
        className={`app-shell ${displayFont.variable} flex min-h-full flex-col md:flex-row`}
        style={
          {
            "--rt-brand": orgBranding.primaryColor,
            "--rt-brand-dark": orgBranding.primaryColorDark,
            // The sidebar is the business's own color, deepened — so a
            // different brand color restyles the whole shell automatically.
            "--app-sidebar": `color-mix(in srgb, ${orgBranding.primaryColor} 38%, #0a1207)`,
          } as React.CSSProperties
        }
      >
        <Sidebar branding={orgBranding} pendingCount={pendingCount} user={user} entries={navEntries} />
        <main className="w-full min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 md:px-8 md:py-10 md:pb-10">
          <div className="mx-auto w-full max-w-6xl">
            {!user.emailVerifiedAt && <VerifyEmailBanner action={resendVerificationEmailAction} />}
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
            <HubTabs entries={navEntries} />
            {children}
          </div>
        </main>
      </div>
    </UnsavedChangesProvider>
  );
}
