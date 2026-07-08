import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

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
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === sessionToken()) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
