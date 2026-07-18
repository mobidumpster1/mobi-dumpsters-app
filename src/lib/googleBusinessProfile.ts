import { db } from "@/lib/db";

const CLIENT_ID = process.env.GOOGLE_BUSINESS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_BUSINESS_REDIRECT_URI;

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ACCOUNT_MGMT_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
// Reviews still live on the legacy v4 Business Information API — Google
// hasn't moved review read/reply onto the newer v1 APIs above.
const LEGACY_BUSINESS_BASE = "https://mybusiness.googleapis.com/v4";

type GoogleBusinessProfileConnection = {
  id: string;
  organizationId: string;
  accountId: string;
  locationId: string | null;
  locationName: string | null;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
};

export function isConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

export function getAuthorizationUrl(state: string) {
  if (!CLIENT_ID || !REDIRECT_URI) {
    throw new Error("Google Business Profile is not configured (missing client ID or redirect URI)");
  }
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  // Forces a refresh token on every consent, even for a user who's
  // authorized before — without this, re-connecting after a revoke
  // silently comes back with no refresh_token.
  url.searchParams.set("prompt", "consent");
  url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/business.manage"
  );
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForTokens(code: string, organizationId: string) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID ?? "",
      client_secret: CLIENT_SECRET ?? "",
      redirect_uri: REDIRECT_URI ?? "",
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${await response.text()}`);
  }
  const data = await response.json();

  const accountsResponse = await fetch(`${ACCOUNT_MGMT_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  if (!accountsResponse.ok) {
    throw new Error(`Couldn't list Google Business accounts: ${await accountsResponse.text()}`);
  }
  const accountsData = await accountsResponse.json();
  const firstAccount = accountsData.accounts?.[0];
  if (!firstAccount) {
    throw new Error("No Google Business Profile account found for this Google login.");
  }

  // Only one Business Profile connection is supported per organization at
  // a time, matching QuickBooksConnection's one-account-per-org limitation.
  await db.googleBusinessProfileConnection.deleteMany({ where: { organizationId } });

  return db.googleBusinessProfileConnection.create({
    data: {
      organizationId,
      accountId: firstAccount.name,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
}

async function refreshAccessToken(connection: GoogleBusinessProfileConnection) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
      client_id: CLIENT_ID ?? "",
      client_secret: CLIENT_SECRET ?? "",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    // Refresh token itself is invalid/expired/revoked — clear the stale
    // connection so the UI falls back to prompting a fresh reconnect
    // instead of failing silently forever.
    await db.googleBusinessProfileConnection.delete({ where: { id: connection.id } }).catch(() => {});
    throw new Error(`Google Business Profile connection expired — please reconnect in Settings. (${detail})`);
  }

  const data = await response.json();
  return db.googleBusinessProfileConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: data.access_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
}

// Returns the current connection with a valid (non-expired) access token,
// refreshing it first if needed. Returns null if not connected yet —
// callers should treat that as "skip the sync", not an error.
export async function getValidConnection(
  organizationId: string
): Promise<GoogleBusinessProfileConnection | null> {
  const connection = await db.googleBusinessProfileConnection.findUnique({ where: { organizationId } });
  if (!connection) return null;

  const expiresInMs = connection.accessTokenExpiresAt.getTime() - Date.now();
  if (expiresInMs > 60_000) return connection;

  return refreshAccessToken(connection);
}

export type GoogleLocation = { name: string; title: string };

export async function listLocations(connection: GoogleBusinessProfileConnection): Promise<GoogleLocation[]> {
  const url = `${BUSINESS_INFO_BASE}/${connection.accountId}/locations?readMask=name,title`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${connection.accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Couldn't list Business Profile locations: ${await response.text()}`);
  }
  const data = await response.json();
  return (data.locations ?? []).map((loc: { name: string; title: string }) => ({
    name: loc.name,
    title: loc.title,
  }));
}

export async function selectLocation(organizationId: string, locationId: string, locationName: string) {
  await db.googleBusinessProfileConnection.update({
    where: { organizationId },
    data: { locationId, locationName },
  });
}

// Pauses/resumes the daily auto-sync without disconnecting (and losing
// the location selection) — the manual "Sync Now" button still works
// regardless of this flag.
export async function setSyncEnabled(organizationId: string, syncEnabled: boolean) {
  await db.googleBusinessProfileConnection.update({
    where: { organizationId },
    data: { syncEnabled },
  });
}

// Upserts by googleReviewId so re-running the sync never creates
// duplicates — same idea as every other cron feature in this app.
export async function syncReviews(organizationId: string): Promise<{ synced: number }> {
  const connection = await getValidConnection(organizationId);
  if (!connection || !connection.locationId) return { synced: 0 };

  const url = `${LEGACY_BUSINESS_BASE}/${connection.accountId}/${connection.locationId}/reviews`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${connection.accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Couldn't fetch Google reviews: ${await response.text()}`);
  }
  const data = await response.json();
  const reviews = data.reviews ?? [];

  let synced = 0;
  for (const review of reviews) {
    await db.googleReview.upsert({
      where: { googleReviewId: review.reviewId },
      create: {
        organizationId,
        googleReviewId: review.reviewId,
        reviewerName: review.reviewer?.displayName ?? "Anonymous",
        starRating: starRatingToNumber(review.starRating),
        comment: review.comment ?? null,
        createTime: new Date(review.createTime),
        replyComment: review.reviewReply?.comment ?? null,
        replyUpdateTime: review.reviewReply?.updateTime ? new Date(review.reviewReply.updateTime) : null,
        replyPostedAt: review.reviewReply ? new Date(review.reviewReply.updateTime) : null,
      },
      update: {
        reviewerName: review.reviewer?.displayName ?? "Anonymous",
        starRating: starRatingToNumber(review.starRating),
        comment: review.comment ?? null,
        replyComment: review.reviewReply?.comment ?? null,
        replyUpdateTime: review.reviewReply?.updateTime ? new Date(review.reviewReply.updateTime) : null,
        replyPostedAt: review.reviewReply ? new Date(review.reviewReply.updateTime) : null,
      },
    });
    synced += 1;
  }

  return { synced };
}

// Runs the daily cron: syncs reviews for every org with a connected,
// location-selected Business Profile. One org's failure (expired token,
// API outage) never stops the rest, same as the app's other cron features.
export async function syncAllConnectedOrganizations(): Promise<{ synced: number; failed: number }> {
  const connections = await db.googleBusinessProfileConnection.findMany({
    where: { locationId: { not: null }, syncEnabled: true },
  });

  let synced = 0;
  let failed = 0;
  for (const connection of connections) {
    try {
      const result = await syncReviews(connection.organizationId);
      synced += result.synced;
    } catch (error) {
      failed += 1;
      console.error(`Google review sync failed for org ${connection.organizationId}:`, error);
    }
  }
  return { synced, failed };
}

function starRatingToNumber(rating: string): number {
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[rating] ?? 0;
}

// Replies are always a manual, staff-composed action — never auto-sent by
// anything, including a future Automation Engine action, since a bad
// public reply on Google is hard to walk back.
export async function postReply(organizationId: string, googleReviewId: string, comment: string) {
  const connection = await getValidConnection(organizationId);
  if (!connection || !connection.locationId) {
    throw new Error("Google Business Profile isn't connected — connect it in Settings first.");
  }

  const url = `${LEGACY_BUSINESS_BASE}/${connection.accountId}/${connection.locationId}/reviews/${googleReviewId}/reply`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });
  if (!response.ok) {
    throw new Error(`Couldn't post reply to Google: ${await response.text()}`);
  }

  await db.googleReview.update({
    where: { googleReviewId },
    data: { replyComment: comment, replyUpdateTime: new Date(), replyPostedAt: new Date() },
  });
}
