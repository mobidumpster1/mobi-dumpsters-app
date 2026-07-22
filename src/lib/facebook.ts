import { db } from "@/lib/db";

const APP_ID = process.env.FACEBOOK_APP_ID;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI;

// Pin to one Graph API version rather than the version-less endpoint —
// Meta deprecates versions on a schedule, so this is the one line to bump
// when that happens.
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AUTHORIZE_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

type FacebookConnection = {
  id: string;
  organizationId: string;
  pageId: string;
  pageName: string;
  accessToken: string;
  accessTokenExpiresAt: Date;
};

export function isFacebookConfigured() {
  return Boolean(APP_ID && APP_SECRET && REDIRECT_URI);
}

export function getAuthorizationUrl(state: string) {
  if (!APP_ID || !REDIRECT_URI) {
    throw new Error("Facebook is not configured (missing app ID or redirect URI)");
  }
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", APP_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "pages_show_list,pages_manage_posts,pages_read_engagement"
  );
  url.searchParams.set("state", state);
  return url.toString();
}

// Three-step Meta dance: short-lived user code -> short-lived user token ->
// long-lived user token -> the Page's own access token (via /me/accounts).
// A Page token minted from a long-lived user token doesn't expire on its
// own schedule the way the user token does, but we still track the user
// token's ~60-day expiry as accessTokenExpiresAt so getValidConnection can
// prompt a reconnect before Meta invalidates the underlying grant, instead
// of a post silently failing with no warning.
export async function exchangeCodeForTokens(code: string, organizationId: string) {
  const shortLivedUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
  shortLivedUrl.searchParams.set("client_id", APP_ID ?? "");
  shortLivedUrl.searchParams.set("client_secret", APP_SECRET ?? "");
  shortLivedUrl.searchParams.set("redirect_uri", REDIRECT_URI ?? "");
  shortLivedUrl.searchParams.set("code", code);

  const shortLivedResponse = await fetch(shortLivedUrl.toString());
  if (!shortLivedResponse.ok) {
    throw new Error(`Facebook token exchange failed: ${await shortLivedResponse.text()}`);
  }
  const shortLived = await shortLivedResponse.json();

  const longLivedUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", APP_ID ?? "");
  longLivedUrl.searchParams.set("client_secret", APP_SECRET ?? "");
  longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

  const longLivedResponse = await fetch(longLivedUrl.toString());
  if (!longLivedResponse.ok) {
    throw new Error(`Facebook long-lived token exchange failed: ${await longLivedResponse.text()}`);
  }
  const longLived = await longLivedResponse.json();

  const pagesResponse = await fetch(
    `${GRAPH_BASE}/me/accounts?access_token=${encodeURIComponent(longLived.access_token)}`
  );
  if (!pagesResponse.ok) {
    throw new Error(`Couldn't list Facebook Pages: ${await pagesResponse.text()}`);
  }
  const pagesData = await pagesResponse.json();
  const firstPage = pagesData.data?.[0];
  if (!firstPage) {
    throw new Error("No Facebook Page found for this login — you need to be an admin of at least one Page.");
  }

  // One Page connection supported per organization at a time, matching
  // every other integration's one-account-per-org limitation.
  await db.facebookConnection.deleteMany({ where: { organizationId } });

  return db.facebookConnection.create({
    data: {
      organizationId,
      pageId: firstPage.id,
      pageName: firstPage.name,
      accessToken: firstPage.access_token,
      accessTokenExpiresAt: new Date(Date.now() + (longLived.expires_in ?? 5_184_000) * 1000),
    },
  });
}

// Returns the current connection, or null if not connected — callers
// should treat that as "can't post right now", not a hard error, same as
// every other getValidConnection in this app.
export async function getValidConnection(organizationId: string): Promise<FacebookConnection | null> {
  const connection = await db.facebookConnection.findUnique({ where: { organizationId } });
  if (!connection) return null;
  if (connection.accessTokenExpiresAt.getTime() < Date.now()) return null;
  return connection;
}

export async function disconnectFacebook(organizationId: string) {
  await db.facebookConnection.deleteMany({ where: { organizationId } });
}

// Posts to the connected Page and logs the attempt either way — a bad
// caption or a revoked token still leaves a record staff can see, instead
// of failing invisibly. imageUrl must be a publicly reachable URL (the
// Vercel Blob URLs this app already stores photos at qualify); when set,
// this posts a photo with the message as its caption via /photos rather
// than a plain text post via /feed.
export async function postToFacebook(
  organizationId: string,
  message: string,
  options?: { imageUrl?: string; bookingId?: string }
): Promise<{ facebookPostId: string }> {
  const connection = await getValidConnection(organizationId);
  if (!connection) {
    throw new Error("Facebook isn't connected — connect it in Settings first.");
  }

  const endpoint = options?.imageUrl
    ? `${GRAPH_BASE}/${connection.pageId}/photos`
    : `${GRAPH_BASE}/${connection.pageId}/feed`;
  const body = new URLSearchParams({ access_token: connection.accessToken });
  if (options?.imageUrl) {
    body.set("url", options.imageUrl);
    body.set("caption", message);
  } else {
    body.set("message", message);
  }

  const response = await fetch(endpoint, { method: "POST", body });
  const data = await response.json();

  if (!response.ok) {
    const error = data?.error?.message ?? JSON.stringify(data);
    await db.facebookPost.create({
      data: {
        organizationId,
        bookingId: options?.bookingId,
        message,
        imageUrl: options?.imageUrl,
        status: "failed",
        error,
      },
    });
    throw new Error(`Couldn't post to Facebook: ${error}`);
  }

  const facebookPostId: string = data.post_id ?? data.id;
  await db.facebookPost.create({
    data: {
      organizationId,
      bookingId: options?.bookingId,
      message,
      imageUrl: options?.imageUrl,
      facebookPostId,
      status: "posted",
      postedAt: new Date(),
    },
  });

  return { facebookPostId };
}
