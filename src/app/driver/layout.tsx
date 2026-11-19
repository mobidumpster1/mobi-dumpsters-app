import Link from "next/link";
import { Archivo } from "next/font/google";
import { requireUser } from "@/lib/session";
import { getOrgBranding } from "@/lib/orgBranding";
import { logout } from "@/app/login/actions";

// Headline face shared with the main admin app.
const displayFont = Archivo({ subsets: ["latin"], variable: "--font-display-face" });

// Deliberately its own minimal layout, not the full internal Sidebar shell
// — this is meant to be usable one-handed on a phone in a truck, by both
// a restricted driver-only account and an owner-operator who just wants a
// faster view than the full Dispatch board. isDriverOnly accounts never
// see "Full App" below; everyone else does.
export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const branding = await getOrgBranding(user.effectiveOrganizationId);

  return (
    <div
      className={`app-shell ${displayFont.variable} min-h-full bg-background`}
      style={
        {
          "--rt-brand": branding.primaryColor,
          "--rt-brand-dark": branding.primaryColorDark,
        } as React.CSSProperties
      }
    >
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <span className="text-sm font-bold tracking-tight text-ink">{branding.businessName}</span>
        <div className="flex items-center gap-4">
          {!user.isDriverOnly && (
            <Link href="/" className="text-sm font-semibold text-brand-fg hover:underline">
              Full App
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="text-xs font-semibold text-zinc-500 hover:underline">
              Sign Out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
