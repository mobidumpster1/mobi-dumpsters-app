import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getAuthorizationUrl, isFacebookConfigured } from "@/lib/facebook";
import { requireUser, hasPlan } from "@/lib/session";

export async function GET(request: NextRequest) {
  if (!isFacebookConfigured()) {
    return NextResponse.redirect(new URL("/settings?fb_error=not_configured", request.url));
  }

  const user = await requireUser();
  if (!hasPlan(user, "pro")) {
    return NextResponse.redirect(new URL("/settings?fb_error=plan", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("fb_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax",
  });

  return NextResponse.redirect(getAuthorizationUrl(state));
}
