import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens } from "@/lib/quickbooks";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("qb_oauth_state")?.value;
  cookieStore.delete("qb_oauth_state");

  if (!code || !realmId) {
    return NextResponse.redirect(new URL("/settings?qb_error=missing_params", request.url));
  }
  if (!state || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?qb_error=invalid_state", request.url));
  }

  try {
    await exchangeCodeForTokens(code, realmId);
  } catch (error) {
    console.error("QuickBooks OAuth callback failed:", error);
    return NextResponse.redirect(new URL("/settings?qb_error=exchange_failed", request.url));
  }

  return NextResponse.redirect(new URL("/settings?qb_connected=1", request.url));
}
