import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission, hasPlan, requireUser } from "@/lib/session";
import { formatDate } from "@/lib/date";
import { setRecommendationStatus } from "./actions";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  search_console: "Search Console",
};

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border-2 border-zinc-900 bg-white p-5">
      <div className="truncate text-sm text-zinc-500">{label}</div>
      <div className="mt-1 break-words text-xl font-semibold text-zinc-900 sm:text-2xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

export default async function MarketingPage() {
  const user = await requireUser();
  if (!hasPermission(user, "canViewReports")) redirect("/");
  if (!hasPlan(user, "pro")) redirect("/");

  const organizationId = user.effectiveOrganizationId;

  const [adsConnection, searchConsoleConnection] = await Promise.all([
    db.googleAdsConnection.findUnique({ where: { organizationId } }),
    db.searchConsoleConnection.findUnique({ where: { organizationId } }),
  ]);

  const weekEnd = new Date();
  const weekStart = new Date(weekEnd.getTime() - 7 * 86_400_000);

  const [adSpendResult, bookingsFromAds, allBookingsThisWeek] = await Promise.all([
    db.adsPerformance.aggregate({
      where: { organizationId, date: { gte: weekStart, lte: weekEnd } },
      _sum: { cost: true, clicks: true },
    }),
    db.booking.findMany({
      where: {
        organizationId,
        createdAt: { gte: weekStart, lte: weekEnd },
        customer: { leadSource: "google_ads" },
      },
      include: { invoices: true },
    }),
    db.booking.count({
      where: { organizationId, createdAt: { gte: weekStart, lte: weekEnd } },
    }),
  ]);

  const adSpendThisWeek = adSpendResult._sum.cost ?? 0;
  const adClicksThisWeek = adSpendResult._sum.clicks ?? 0;
  const bookingsFromAdsCount = bookingsFromAds.length;
  const revenueFromAds = bookingsFromAds.reduce(
    (sum, booking) => sum + booking.invoices.reduce((s, inv) => s + inv.amount, 0),
    0
  );
  const costPerBooking = bookingsFromAdsCount > 0 ? adSpendThisWeek / bookingsFromAdsCount : null;

  const [openRecommendations, openRecommendationsTotal] = await Promise.all([
    db.marketingRecommendation.findMany({
      where: { organizationId, status: "open" },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.marketingRecommendation.count({ where: { organizationId, status: "open" } }),
  ]);

  const latestSeoWeek = await db.seoPerformance.findFirst({
    where: { organizationId },
    orderBy: { weekStart: "desc" },
    select: { weekStart: true },
  });
  const seoOpportunities = latestSeoWeek
    ? await db.seoPerformance.findMany({
        where: {
          organizationId,
          weekStart: latestSeoWeek.weekStart,
          position: { gte: 11, lte: 20 },
          impressions: { gt: 0 },
        },
        orderBy: { impressions: "desc" },
        take: 20,
      })
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">Marketing Intelligence</h1>
        <p className="mt-1 text-zinc-500">
          Google Ads spend and local SEO opportunities, synced automatically. Every recommendation
          below is a suggestion — nothing here changes an actual campaign, bid, or page on your
          behalf; you review it and make the change yourself.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-black text-ink">Ad Spend vs. Bookings This Week</h2>
        {!adsConnection ? (
          <p className="mt-3 rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            Google Ads isn&apos;t connected yet.{" "}
            <Link href="/settings" className="font-semibold text-brand hover:underline">
              Connect it in Settings
            </Link>{" "}
            to see spend here.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-zinc-500">
              &quot;Bookings from Google Ads&quot; counts jobs from a customer whose lead source is
              tagged Google Ads (captured from the ad click&apos;s UTM parameters) — a real
              attribution signal already in your data, not just two numbers from the same week.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
              <SummaryCard label="Ad Spend (7 days)" value={`$${adSpendThisWeek.toFixed(2)}`} sub={`${adClicksThisWeek} clicks`} />
              <SummaryCard
                label="Bookings from Google Ads"
                value={String(bookingsFromAdsCount)}
                sub={`${allBookingsThisWeek} total bookings this week`}
              />
              <SummaryCard label="Revenue from Google Ads" value={`$${revenueFromAds.toFixed(2)}`} />
              <SummaryCard
                label="Cost per Booking"
                value={costPerBooking === null ? "—" : `$${costPerBooking.toFixed(2)}`}
              />
            </div>
          </>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-black text-ink">Open Recommendations</h2>
          {openRecommendationsTotal > openRecommendations.length && (
            <span className="text-sm text-zinc-500">
              Showing 5 of {openRecommendationsTotal} open
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {openRecommendations.map((rec) => (
            <div key={rec.id} className="rounded-lg border-2 border-zinc-900 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                    {SOURCE_LABELS[rec.source] ?? rec.source}
                  </span>
                  <p className="mt-2 font-semibold text-ink">{rec.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{rec.detail}</p>
                  <p className="mt-2 text-xs text-zinc-400">Updated {formatDate(rec.updatedAt)}</p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <form action={setRecommendationStatus.bind(null, rec.id, "actioned")}>
                    <button
                      type="submit"
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
                    >
                      Mark Actioned
                    </button>
                  </form>
                  <form action={setRecommendationStatus.bind(null, rec.id, "dismissed")}>
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                    >
                      Dismiss
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
          {openRecommendations.length === 0 && (
            <p className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-zinc-400">
              {adsConnection || searchConsoleConnection
                ? "No open recommendations right now."
                : "Connect Google Ads or Search Console in Settings to start getting recommendations."}
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-ink">SEO Opportunities (Page 2)</h2>
        {!searchConsoleConnection ? (
          <p className="mt-3 rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            Search Console isn&apos;t connected yet.{" "}
            <Link href="/settings" className="font-semibold text-brand hover:underline">
              Connect it in Settings
            </Link>{" "}
            to see local SEO opportunities here.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-zinc-500">
              Queries sitting at position 11–20 with real impression volume — usually the
              fastest-improving targets for a content or on-page update. From the week of{" "}
              {latestSeoWeek ? formatDate(latestSeoWeek.weekStart) : "—"}.
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Query</th>
                    <th className="px-5 py-3.5 font-semibold">Page</th>
                    <th className="px-5 py-3.5 font-semibold">Impressions</th>
                    <th className="px-5 py-3.5 font-semibold">Position</th>
                    <th className="px-5 py-3.5 font-semibold">Service Area</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {seoOpportunities.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-4 font-medium text-zinc-900">{row.query}</td>
                      <td className="max-w-xs truncate px-5 py-4 text-zinc-600">
                        <a href={row.page} target="_blank" rel="noreferrer" className="hover:underline">
                          {row.page}
                        </a>
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{row.impressions}</td>
                      <td className="px-5 py-4 text-zinc-600">{row.position.toFixed(1)}</td>
                      <td className="px-5 py-4 text-zinc-600">
                        {row.serviceArea ?? "—"}
                        {row.serviceType ? ` · ${row.serviceType.replace("_", " ")}` : ""}
                      </td>
                    </tr>
                  ))}
                  {seoOpportunities.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-4 text-center text-zinc-400">
                        {latestSeoWeek
                          ? "No page-2 opportunities this week — nice problem to have."
                          : "No data synced yet — check back after the first weekly sync."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
