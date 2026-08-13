import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { branding } from "@/lib/branding";

// Deliberately its own minimal layout (no Sidebar) so this reads as a
// distinct, focused tool — the point of building it standalone was so
// Chase can "Add to Home Screen" and land straight in the search, not the
// full app shell. Still lives inside the authenticated app (proxy.ts only
// treats it as public via the STATIC_ASSET_PATTERN, which this route
// doesn't match), so the Google Places API key stays server-side.
export const metadata: Metadata = {
  title: `Company Prospecting — ${branding.businessName}`,
  manifest: "/prospecting.webmanifest",
  appleWebApp: {
    title: "Prospecting",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: branding.primaryColor,
};

export default function ProspectingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <span className="text-sm font-bold tracking-tight text-ink">
            {branding.businessName}
          </span>
          <Link href="/leads" className="text-xs font-semibold text-brand hover:underline">
            Back to full app
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
