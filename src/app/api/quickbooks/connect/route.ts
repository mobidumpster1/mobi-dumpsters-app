import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getAuthorizationUrl, isQuickBooksConfigured } from "@/lib/quickbooks";
import { requireUser, hasPlan } from "@/lib/session";

export async function GET(request: NextRequest) {
  if (!isQuickBooksConfigured()) {
    return NextResponse.redirect(
      new URL("/settings?qb_error=not_configured", request.url)
    );
  }

  const user = await requireUser();
  if (!hasPlan(user, "team")) {
    return NextResponse.redirect(new URL("/settings?qb_error=plan", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("qb_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax",
  });

  return NextResponse.redirect(getAuthorizationUrl(state));
}
