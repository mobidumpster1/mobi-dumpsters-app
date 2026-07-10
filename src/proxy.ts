import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Public routes anyone can reach without logging in — the customer-facing
// booking flow and agreement signing, the login page itself, the cron
// endpoints Vercel calls on a schedule (which can't log in and are instead
// protected by CRON_SECRET, see src/app/api/cron/*/route.ts), and the
// privacy/terms pages required by Intuit's QuickBooks app review.
const PUBLIC_PATHS = [
  "/login",
  "/book",
  "/agreement",
  "/api/cron",
  "/privacy",
  "/terms",
  "/dumpster-rental",
  "/booking",
  "/leads-unsubscribe",
];

// Static assets (logo, icons, manifest, etc.) — these need to load for
// anyone regardless of login state: customers on /book, email clients
// fetching the logo image in HTML emails, browsers requesting a favicon.
// Missed this earlier, which silently broke the logo in outgoing emails.
const STATIC_ASSET_PATTERN = /\.(jpg|jpeg|png|gif|svg|webp|ico|webmanifest|css|js|txt|xml)$/i;

function isPublic(pathname: string) {
  if (STATIC_ASSET_PATTERN.test(pathname)) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Only checks the signature/expiry here — a fast, DB-free check so every
  // request doesn't need a round trip. Whether the user is still active
  // (not deactivated) is enforced separately in src/lib/session.ts, which
  // runs in the actual pages/actions where a database is available.
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(cookie)) {
    return NextResponse.next();
  }

  // API routes are called by fetch/SDK code (e.g. the Vercel Blob upload
  // client), not a browser navigating — redirecting them to the HTML
  // /login page breaks the caller, which expects JSON and gets a page
  // instead. A plain 401 lets it fail with a real error rather than a
  // confusing "failed to retrieve the client token"-style message.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
