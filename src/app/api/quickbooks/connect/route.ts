import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getAuthorizationUrl, isQuickBooksConfigured } from "@/lib/quickbooks";

export async function GET(request: NextRequest) {
  if (!isQuickBooksConfigured()) {
    return NextResponse.redirect(
      new URL("/settings?qb_error=not_configured", request.url)
    );
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
