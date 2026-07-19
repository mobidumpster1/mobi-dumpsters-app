import { db } from "@/lib/db";

const CLIENT_ID = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI;

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/webmasters/v3";

type SearchConsoleConnection = {
  id: string;
  organizationId: string;
  siteUrl: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
};

export function isConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

export function getAuthorizationUrl(state: string) {
  if (!CLIENT_ID || !REDIRECT_URI) {
    throw new Error("Search Console is not configured (missing client ID or redirect URI)");
  }
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  // Read-only scope — this app can never submit a sitemap, request
  // indexing, or change anything about the property, by construction.
  url.searchParams.set("scope", "https://www.googleapis.com/auth/webmasters.readonly");
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

// Lists the Search Console properties the connected login can access and
// picks one — prefers a site whose URL contains the org's own configured
// public domain (so a login with several verified properties connects
// the right one automatically), falling back to the first result.
async function pickSite(accessToken: string, organizationId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Couldn't list Search Console sites: ${await response.text()}`);
  }
  const data = await response.json();
  const sites: { siteUrl: string }[] = data.siteEntry ?? [];
  if (sites.length === 0) {
    throw new Error("This Google login has no verified Search Console properties.");
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { publicDomain: true },
  });
  if (org?.publicDomain) {
    const match = sites.find((s) => s.siteUrl.includes(org.publicDomain as string));
    if (match) return match.siteUrl;
  }
  return sites[0].siteUrl;
}

export async function exchangeCodeForTokens(code: string, organizationId: string) {
  const data = await requestTokens({
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID ?? "",
    client_secret: CLIENT_SECRET ?? "",
    redirect_uri: REDIRECT_URI ?? "",
  });

  const siteUrl = await pickSite(data.access_token, organizationId);

  // Only one Search Console connection is supported per organization at a
  // time, matching every other integration's one-account-per-org limit.
  await db.searchConsoleConnection.deleteMany({ where: { organizationId } });

  return db.searchConsoleConnection.create({
    data: {
      organizationId,
      siteUrl,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
}

async function refreshAccessToken(connection: SearchConsoleConnection) {
  let data;
  try {
    data = await requestTokens({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
      client_id: CLIENT_ID ?? "",
      client_secret: CLIENT_SECRET ?? "",
    });
  } catch (err) {
    await db.searchConsoleConnection.delete({ where: { id: connection.id } }).catch(() => {});
    throw new Error(
      `Search Console connection expired — please reconnect in Settings. (${err instanceof Error ? err.message : String(err)})`
    );
  }

  return db.searchConsoleConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: data.access_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
}

export async function getValidConnection(organizationId: string): Promise<SearchConsoleConnection | null> {
  const connection = await db.searchConsoleConnection.findUnique({ where: { organizationId } });
  if (!connection) return null;

  const expiresInMs = connection.accessTokenExpiresAt.getTime() - Date.now();
  if (expiresInMs > 60_000) return connection;

  return refreshAccessToken(connection);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

type SearchAnalyticsRow = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

async function searchAnalyticsQuery(
  connection: SearchConsoleConnection,
  startDate: Date,
  endDate: Date
): Promise<SearchAnalyticsRow[]> {
  const response = await fetch(
    `${API_BASE}/sites/${encodeURIComponent(connection.siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: isoDate(startDate),
        endDate: isoDate(endDate),
        dimensions: ["query", "page"],
        rowLimit: 5000,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Search Console query failed: ${await response.text()}`);
  }
  const data = await response.json();
  return (data.rows ?? []).map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
    query: row.keys[0],
    page: row.keys[1],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

// This app's actual service footprint — used only to tag rows for
// Phase 3's dashboard grouping, never to filter what gets fetched or
// stored (a query outside this list is still worth seeing in raw form).
const SERVICE_AREAS = ["Macon", "Warner Robins", "Perry", "Fort Valley", "Milledgeville"];
const SERVICE_TYPE_KEYWORDS: Record<string, string[]> = {
  dumpster_rental: ["dumpster", "roll off", "roll-off", "rolloff"],
  junk_removal: ["junk removal", "junk hauling", "junk pickup"],
  demolition: ["demolition", "demo "],
  material_delivery: ["mulch", "soil", "topsoil", "rock delivery", "gravel", "material delivery"],
};

export function classifyQuery(query: string): { serviceArea: string | null; serviceType: string | null } {
  const lower = query.toLowerCase();

  const serviceArea =
    SERVICE_AREAS.find((area) => lower.includes(area.toLowerCase())) ?? null;

  let serviceType: string | null = null;
  for (const [type, keywords] of Object.entries(SERVICE_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      serviceType = type;
      break;
    }
  }

  return { serviceArea, serviceType };
}

// Impressions floor before a page-11-20 query is worth flagging — a
// handful of impressions on page 2 isn't a real opportunity yet.
const PAGE_TWO_IMPRESSIONS_THRESHOLD = 50;

async function upsertRecommendation(
  organizationId: string,
  type: string,
  relatedEntityId: string,
  title: string,
  detail: string
) {
  await db.marketingRecommendation.upsert({
    where: {
      organizationId_source_type_relatedEntityId: {
        organizationId,
        source: "search_console",
        type,
        relatedEntityId,
      },
    },
    create: { organizationId, source: "search_console", type, relatedEntityId, title, detail },
    update: { title, detail, updatedAt: new Date() },
  });
}

async function generatePageTwoRecommendations(organizationId: string, weekStart: Date) {
  const rows = await db.seoPerformance.findMany({
    where: {
      organizationId,
      weekStart,
      impressions: { gt: PAGE_TWO_IMPRESSIONS_THRESHOLD },
      position: { gte: 11, lte: 20 },
    },
  });

  for (const row of rows) {
    const areaNote = row.serviceArea ? ` in ${row.serviceArea}` : "";
    await upsertRecommendation(
      organizationId,
      "page_two_opportunity",
      `${row.query}::${row.page}`,
      `"${row.query}" is on page 2 — worth a push${areaNote}`,
      `${row.impressions} impressions and an average position of ${row.position.toFixed(1)} for "${row.query}" on ${row.page} this week. A page-2 query with real impression volume is usually the fastest-improving target for a content or on-page SEO update.`
    );
  }
}

// Aggregates clicks/impressions per page across the last 3 distinct
// weekly pulls and flags any page whose CTR strictly declined week over
// week across all three — needs at least 3 weeks of history to fire, so
// this naturally does nothing on a freshly-connected property.
async function generateDecliningCtrRecommendations(organizationId: string) {
  const recentWeeks = await db.seoPerformance.findMany({
    where: { organizationId },
    distinct: ["weekStart"],
    orderBy: { weekStart: "desc" },
    take: 3,
    select: { weekStart: true },
  });
  if (recentWeeks.length < 3) return;
  const weekStarts = recentWeeks.map((w) => w.weekStart).sort((a, b) => a.getTime() - b.getTime());

  const rows = await db.seoPerformance.findMany({
    where: { organizationId, weekStart: { in: weekStarts } },
  });

  const byPage = new Map<string, Map<number, { clicks: number; impressions: number }>>();
  for (const row of rows) {
    const weekIndex = weekStarts.findIndex((w) => w.getTime() === row.weekStart.getTime());
    const pageWeeks = byPage.get(row.page) ?? new Map();
    const entry = pageWeeks.get(weekIndex) ?? { clicks: 0, impressions: 0 };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    pageWeeks.set(weekIndex, entry);
    byPage.set(row.page, pageWeeks);
  }

  for (const [page, pageWeeks] of byPage) {
    if (pageWeeks.size < 3) continue;
    const ctrs = [0, 1, 2].map((i) => {
      const w = pageWeeks.get(i);
      return w && w.impressions > 0 ? w.clicks / w.impressions : 0;
    });
    const [oldest, middle, latest] = ctrs;
    if (!(oldest > middle && middle > latest)) continue;

    await upsertRecommendation(
      organizationId,
      "declining_ctr",
      page,
      `Click-through rate is declining on ${page}`,
      `CTR has fallen for 3 straight weekly pulls: ${(oldest * 100).toFixed(1)}% → ${(middle * 100).toFixed(1)}% → ${(latest * 100).toFixed(1)}%. Often means the title/meta description no longer stands out, or a competitor moved above it.`
    );
  }
}

// Pulls the most recently complete 7-day window (Search Console data lags
// a few days behind real time), upserts every (query, page) row into
// SeoPerformance tagged with its service area/type, then runs both
// recommendation analyses. Called by the weekly cron.
export async function syncSeoPerformance(organizationId: string) {
  const connection = await getValidConnection(organizationId);
  if (!connection) return;

  try {
    const endDate = new Date(Date.now() - 3 * 86_400_000);
    const startDate = new Date(endDate.getTime() - 6 * 86_400_000);
    const weekStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));

    const rows = await searchAnalyticsQuery(connection, startDate, endDate);

    for (const row of rows) {
      const { serviceArea, serviceType } = classifyQuery(row.query);
      await db.seoPerformance.upsert({
        where: {
          organizationId_weekStart_query_page: {
            organizationId,
            weekStart,
            query: row.query,
            page: row.page,
          },
        },
        create: {
          organizationId,
          weekStart,
          query: row.query,
          page: row.page,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
          serviceArea,
          serviceType,
        },
        update: {
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
          serviceArea,
          serviceType,
        },
      });
    }

    await generatePageTwoRecommendations(organizationId, weekStart);
    await generateDecliningCtrRecommendations(organizationId);

    await db.searchConsoleConnection.update({
      where: { organizationId },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });
  } catch (err) {
    await db.searchConsoleConnection
      .update({
        where: { organizationId },
        data: { lastSyncError: err instanceof Error ? err.message : String(err) },
      })
      .catch(() => {});
    throw err;
  }
}

export async function syncAllConnectedOrganizations() {
  const connections = await db.searchConsoleConnection.findMany({ select: { organizationId: true } });
  for (const { organizationId } of connections) {
    try {
      await syncSeoPerformance(organizationId);
    } catch {
      // Already recorded on the connection row above — one broken
      // connection never blocks everyone else's sync.
    }
  }
}
