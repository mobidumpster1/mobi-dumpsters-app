import { db } from "@/lib/db";

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_ADS_REDIRECT_URI;
// Issued once per Google Ads manager account via the API Center in the Ads
// UI (not per-org, unlike the OAuth client) — required on every API call
// regardless of which customer account is being queried.
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
// Google deprecates old Ads API versions roughly every 3 quarters — bump
// this if calls start failing with a version-sunset error.
const API_VERSION = "v17";
const API_BASE = `https://googleads.googleapis.com/${API_VERSION}`;

type GoogleAdsConnection = {
  id: string;
  organizationId: string;
  customerId: string;
  loginCustomerId: string | null;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
};

export function isConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI && DEVELOPER_TOKEN);
}

export function getAuthorizationUrl(state: string) {
  if (!CLIENT_ID || !REDIRECT_URI) {
    throw new Error("Google Ads is not configured (missing client ID or redirect URI)");
  }
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  // Forces a refresh token even for a login that's authorized before —
  // without this, re-connecting after a revoke comes back with none.
  url.searchParams.set("prompt", "consent");
  // Read/report scope only — this app never requests write access to a
  // Google Ads account, so nothing here can pause a campaign, change a
  // bid, or move budget, by construction (not just by choosing not to).
  url.searchParams.set("scope", "https://www.googleapis.com/auth/adwords");
  url.searchParams.set("state", state);
  return url.toString();
}

async function requestTokens(body: Record<string, string>) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!response.ok) {
    throw new Error(`Google token request failed: ${await response.text()}`);
  }
  return response.json();
}

// Calls listAccessibleCustomers with a freshly-issued access token to find
// which Ads account(s) this Google login can see, and picks the first one
// — same "just take the first result" precedent as
// GoogleBusinessProfileConnection's account selection. A staff member with
// access to more than one account can fix the connected customerId later
// via a picker (not built yet — out of scope for Phase 1).
async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": DEVELOPER_TOKEN ?? "",
    },
  });
  if (!response.ok) {
    throw new Error(`Couldn't list accessible Google Ads accounts: ${await response.text()}`);
  }
  const data = await response.json();
  // Each entry is "customers/1234567890" — strip the prefix.
  return (data.resourceNames ?? []).map((name: string) => name.replace("customers/", ""));
}

export async function exchangeCodeForTokens(code: string, organizationId: string) {
  const data = await requestTokens({
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID ?? "",
    client_secret: CLIENT_SECRET ?? "",
    redirect_uri: REDIRECT_URI ?? "",
  });

  const accessibleCustomers = await listAccessibleCustomers(data.access_token);
  const customerId = accessibleCustomers[0];
  if (!customerId) {
    throw new Error("This Google login doesn't have access to any Google Ads account.");
  }

  // Only one Google Ads connection is supported per organization at a
  // time, matching every other integration's one-account-per-org limit.
  await db.googleAdsConnection.deleteMany({ where: { organizationId } });

  return db.googleAdsConnection.create({
    data: {
      organizationId,
      customerId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
}

async function refreshAccessToken(connection: GoogleAdsConnection) {
  let data;
  try {
    data = await requestTokens({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
      client_id: CLIENT_ID ?? "",
      client_secret: CLIENT_SECRET ?? "",
    });
  } catch (err) {
    // The refresh token itself is invalid/expired/revoked — clear the
    // stale connection so Settings falls back to prompting a fresh
    // reconnect instead of failing silently forever.
    await db.googleAdsConnection.delete({ where: { id: connection.id } }).catch(() => {});
    throw new Error(
      `Google Ads connection expired — please reconnect in Settings. (${err instanceof Error ? err.message : String(err)})`
    );
  }

  return db.googleAdsConnection.update({
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
export async function getValidConnection(organizationId: string): Promise<GoogleAdsConnection | null> {
  const connection = await db.googleAdsConnection.findUnique({ where: { organizationId } });
  if (!connection) return null;

  const expiresInMs = connection.accessTokenExpiresAt.getTime() - Date.now();
  if (expiresInMs > 60_000) return connection;

  return refreshAccessToken(connection);
}

type GaqlRow = Record<string, Record<string, unknown>>;

// Runs one GAQL query against the connected customer account, following
// pagination to completion. Every call is a `search` (read) request —
// nothing in this file ever calls a mutate endpoint.
async function runGaql(connection: GoogleAdsConnection, query: string): Promise<GaqlRow[]> {
  const rows: GaqlRow[] = [];
  let pageToken: string | undefined;

  do {
    const response = await fetch(`${API_BASE}/customers/${connection.customerId}/googleAds:search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "developer-token": DEVELOPER_TOKEN ?? "",
        ...(connection.loginCustomerId ? { "login-customer-id": connection.loginCustomerId } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, pageToken }),
    });
    if (!response.ok) {
      throw new Error(`Google Ads query failed: ${await response.text()}`);
    }
    const data = await response.json();
    rows.push(...(data.results ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return rows;
}

function gaqlDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function microsToDollars(micros: unknown): number {
  return Number(micros ?? 0) / 1_000_000;
}

export type CampaignDayMetrics = {
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
};

export async function fetchCampaignPerformance(
  connection: GoogleAdsConnection,
  since: Date,
  until: Date
): Promise<CampaignDayMetrics[]> {
  const query = `
    SELECT campaign.id, campaign.name, segments.date,
           metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${gaqlDate(since)}' AND '${gaqlDate(until)}'
      AND campaign.status != 'REMOVED'
  `;
  const rows = await runGaql(connection, query);
  return rows.map((row) => ({
    campaignId: String(row.campaign?.id),
    campaignName: String(row.campaign?.name ?? "—"),
    date: String(row.segments?.date),
    impressions: Number(row.metrics?.impressions ?? 0),
    clicks: Number(row.metrics?.clicks ?? 0),
    cost: microsToDollars(row.metrics?.costMicros),
    conversions: Number(row.metrics?.conversions ?? 0),
  }));
}

type SearchTermRow = {
  searchTerm: string;
  campaignId: string;
  campaignName: string;
  cost: number;
  clicks: number;
  conversions: number;
};

async function fetchSearchTerms(connection: GoogleAdsConnection, since: Date, until: Date): Promise<SearchTermRow[]> {
  const query = `
    SELECT search_term_view.search_term, campaign.id, campaign.name,
           metrics.cost_micros, metrics.clicks, metrics.conversions
    FROM search_term_view
    WHERE segments.date BETWEEN '${gaqlDate(since)}' AND '${gaqlDate(until)}'
  `;
  const rows = await runGaql(connection, query);

  // Aggregate per (campaign, search term) — the API returns one row per
  // ad group the term matched under, and a term worth flagging is judged
  // on its total spend across the campaign, not any single ad group.
  const byTerm = new Map<string, SearchTermRow>();
  for (const row of rows) {
    const searchTerm = String(row.searchTermView?.searchTerm ?? "");
    const campaignId = String(row.campaign?.id);
    const key = `${campaignId}:${searchTerm}`;
    const existing = byTerm.get(key) ?? {
      searchTerm,
      campaignId,
      campaignName: String(row.campaign?.name ?? "—"),
      cost: 0,
      clicks: 0,
      conversions: 0,
    };
    existing.cost += microsToDollars(row.metrics?.costMicros);
    existing.clicks += Number(row.metrics?.clicks ?? 0);
    existing.conversions += Number(row.metrics?.conversions ?? 0);
    byTerm.set(key, existing);
  }
  return Array.from(byTerm.values());
}

type AdGroupRow = {
  adGroupId: string;
  adGroupName: string;
  campaignName: string;
  clicks: number;
  cost: number;
  conversions: number;
};

async function fetchAdGroupPerformance(connection: GoogleAdsConnection, since: Date, until: Date): Promise<AdGroupRow[]> {
  const query = `
    SELECT ad_group.id, ad_group.name, campaign.name,
           metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM ad_group
    WHERE segments.date BETWEEN '${gaqlDate(since)}' AND '${gaqlDate(until)}'
      AND ad_group.status = 'ENABLED'
  `;
  const rows = await runGaql(connection, query);

  const byAdGroup = new Map<string, AdGroupRow>();
  for (const row of rows) {
    const adGroupId = String(row.adGroup?.id);
    const existing = byAdGroup.get(adGroupId) ?? {
      adGroupId,
      adGroupName: String(row.adGroup?.name ?? "—"),
      campaignName: String(row.campaign?.name ?? "—"),
      clicks: 0,
      cost: 0,
      conversions: 0,
    };
    existing.clicks += Number(row.metrics?.clicks ?? 0);
    existing.cost += microsToDollars(row.metrics?.costMicros);
    existing.conversions += Number(row.metrics?.conversions ?? 0);
    byAdGroup.set(adGroupId, existing);
  }
  return Array.from(byAdGroup.values());
}

// Dollar floor before a zero-conversion search term is worth flagging —
// below this, even a full negative-keyword miss is noise, not a real
// budget leak.
const NEGATIVE_KEYWORD_COST_THRESHOLD = 20;
// Minimum clicks before an ad group's conversion rate is judged against
// the account average — a 1-click ad group being "0% vs 5% average"
// isn't a real signal yet.
const AD_GROUP_MIN_CLICKS = 10;

async function upsertRecommendation(
  organizationId: string,
  source: string,
  type: string,
  relatedEntityId: string,
  title: string,
  detail: string
) {
  await db.marketingRecommendation.upsert({
    where: {
      organizationId_source_type_relatedEntityId: { organizationId, source, type, relatedEntityId },
    },
    create: { organizationId, source, type, relatedEntityId, title, detail },
    // A dismissed/actioned recommendation stays that way even if the
    // underlying condition still holds on the next sync — only the
    // title/detail text refreshes with the latest numbers.
    update: { title, detail, updatedAt: new Date() },
  });
}

// Runs the search-term and ad-group analyses over the trailing 14 days and
// writes/refreshes MarketingRecommendation rows — never sends, pauses, or
// changes anything on the actual Google Ads account.
async function generateRecommendations(connection: GoogleAdsConnection, organizationId: string) {
  const until = new Date();
  const since = new Date(until.getTime() - 14 * 86_400_000);

  const [searchTerms, adGroups] = await Promise.all([
    fetchSearchTerms(connection, since, until),
    fetchAdGroupPerformance(connection, since, until),
  ]);

  for (const term of searchTerms) {
    if (term.conversions > 0 || term.cost < NEGATIVE_KEYWORD_COST_THRESHOLD) continue;
    await upsertRecommendation(
      organizationId,
      "google_ads",
      "negative_keyword",
      `${term.campaignId}:${term.searchTerm}`,
      `Add "${term.searchTerm}" as a negative keyword`,
      `Campaign "${term.campaignName}" spent $${term.cost.toFixed(2)} on the search term "${term.searchTerm}" with 0 conversions in the last 14 days.`
    );
  }

  const eligibleAdGroups = adGroups.filter((g) => g.clicks >= AD_GROUP_MIN_CLICKS);
  const totalClicks = eligibleAdGroups.reduce((sum, g) => sum + g.clicks, 0);
  const totalConversions = eligibleAdGroups.reduce((sum, g) => sum + g.conversions, 0);
  const accountConversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;

  for (const group of eligibleAdGroups) {
    const groupRate = group.clicks > 0 ? group.conversions / group.clicks : 0;
    if (accountConversionRate <= 0) continue;
    const percentBelowAverage = ((accountConversionRate - groupRate) / accountConversionRate) * 100;
    if (percentBelowAverage <= 20) continue;
    await upsertRecommendation(
      organizationId,
      "google_ads",
      "underperforming_ad_group",
      group.adGroupId,
      `Ad group "${group.adGroupName}" is converting well below average`,
      `In campaign "${group.campaignName}", this ad group converts at ${(groupRate * 100).toFixed(1)}% vs. the account average of ${(accountConversionRate * 100).toFixed(1)}% over the last 14 days (${group.clicks} clicks, ${group.conversions.toFixed(1)} conversions).`
    );
  }
}

// Pulls the trailing 30 days of campaign metrics, upserts them into
// AdsPerformance (idempotent re-runs via the organizationId+campaignId+date
// unique constraint), then runs the recommendation analyses. Called both
// by the daily cron and by a future manual "Sync Now" action.
export async function syncAdsPerformance(organizationId: string) {
  const connection = await getValidConnection(organizationId);
  if (!connection) return;

  try {
    const until = new Date();
    const since = new Date(until.getTime() - 30 * 86_400_000);
    const rows = await fetchCampaignPerformance(connection, since, until);

    for (const row of rows) {
      await db.adsPerformance.upsert({
        where: {
          organizationId_campaignId_date: {
            organizationId,
            campaignId: row.campaignId,
            date: new Date(row.date),
          },
        },
        create: {
          organizationId,
          campaignId: row.campaignId,
          campaignName: row.campaignName,
          date: new Date(row.date),
          impressions: row.impressions,
          clicks: row.clicks,
          cost: row.cost,
          conversions: row.conversions,
        },
        update: {
          campaignName: row.campaignName,
          impressions: row.impressions,
          clicks: row.clicks,
          cost: row.cost,
          conversions: row.conversions,
        },
      });
    }

    await generateRecommendations(connection, organizationId);

    await db.googleAdsConnection.update({
      where: { organizationId },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });
  } catch (err) {
    // One org's API failure (expired token, suspended account, quota) never
    // throws out of the cron loop — recorded so Settings can surface it
    // instead of failing silently forever.
    await db.googleAdsConnection
      .update({
        where: { organizationId },
        data: { lastSyncError: err instanceof Error ? err.message : String(err) },
      })
      .catch(() => {});
    throw err;
  }
}

export async function syncAllConnectedOrganizations() {
  const connections = await db.googleAdsConnection.findMany({ select: { organizationId: true } });
  for (const { organizationId } of connections) {
    try {
      await syncAdsPerformance(organizationId);
    } catch {
      // Already recorded on the connection row above — move on to the
      // next org so one broken connection never blocks everyone else's
      // sync, same precedent as every other daily cron in this app.
    }
  }
}
