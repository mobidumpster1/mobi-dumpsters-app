import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens } from "@/lib/facebook";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("fb_oauth_state")?.value;
  cookieStore.delete("fb_oauth_state");

  if (!code) {
    return NextResponse.redirect(new URL("/settings?fb_error=missing_params", request.url));
  }
  if (!state || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?fb_error=invalid_state", request.url));
  }

  try {
    await exchangeCodeForTokens(code, user.effectiveOrganizationId);
  } catch (error) {
    console.error("Facebook OAuth callback failed:", error);
    return NextResponse.redirect(new URL("/settings?fb_error=exchange_failed", request.url));
  }

  return NextResponse.redirect(new URL("/settings?fb_connected=1", request.url));
}
