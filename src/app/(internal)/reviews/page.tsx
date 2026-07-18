import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPlan, requireUser } from "@/lib/session";
import { isConfigured } from "@/lib/googleBusinessProfile";
import { formatDate } from "@/lib/date";
import { ReviewSyncButton } from "@/components/ReviewSyncButton";
import { ReviewSyncToggle } from "@/components/ReviewSyncToggle";
import { ReviewReplyForm } from "@/components/ReviewReplyForm";
import { GoogleLocationPicker } from "@/components/GoogleLocationPicker";

export const dynamic = "force-dynamic";

function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-500" aria-label={`${count} star review`}>
      {"★".repeat(count)}
      <span className="text-zinc-300">{"★".repeat(5 - count)}</span>
    </span>
  );
}

export default async function ReviewsPage() {
  const user = await requireUser();
  if (!hasPlan(user, "pro")) redirect("/");

  const [connection, reviews] = await Promise.all([
    db.googleBusinessProfileConnection.findUnique({
      where: { organizationId: user.effectiveOrganizationId },
    }),
    db.googleReview.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { createTime: "desc" },
    }),
  ]);

  return (
    <div>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">Reviews</h1>
        <p className="mt-1 text-zinc-500">
          Google reviews sync in automatically once a day — replies are always sent by a person,
          never automated.
        </p>
      </div>

      {!isConfigured() ? (
        <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
          <p className="text-sm text-zinc-600">
            Google Business Profile isn&apos;t configured yet — this needs Google-approved API
            credentials, which is a manual approval process on Google&apos;s side. Once that&apos;s
            done, add the credentials to the app&apos;s environment variables and this page will
            offer to connect.
          </p>
        </div>
      ) : !connection ? (
        <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
          <p className="text-sm text-zinc-600">Not connected yet.</p>
          <a
            href="/api/google-business/connect"
            className="mt-3 inline-block rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Connect Google Business Profile
          </a>
        </div>
      ) : !connection.locationId ? (
        <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
          <GoogleLocationPicker />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-zinc-900 bg-white p-5">
            <div>
              <p className="text-sm text-zinc-600">
                {connection.syncEnabled ? "Auto-syncing" : "Auto-sync paused"} for{" "}
                <span className="font-semibold text-zinc-900">{connection.locationName}</span>
              </p>
              <p className="text-xs text-zinc-400">
                Manual Sync Now always works, whether or not the daily auto-sync is on.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ReviewSyncToggle syncEnabled={connection.syncEnabled} />
              <ReviewSyncButton />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border-2 border-zinc-900 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-zinc-900">{review.reviewerName}</span>
                    <span className="ml-2">
                      <Stars count={review.starRating} />
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">{formatDate(review.createTime)}</span>
                </div>
                {review.comment && <p className="mt-2 text-sm text-zinc-700">{review.comment}</p>}
                {review.replyPostedAt && (
                  <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm">
                    <p className="text-xs font-semibold text-zinc-500">Your reply</p>
                    <p className="mt-1 text-zinc-700">{review.replyComment}</p>
                  </div>
                )}
                <ReviewReplyForm reviewId={review.id} existingReply={review.replyComment} />
              </div>
            ))}
            {reviews.length === 0 && (
              <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
                No reviews synced yet — click Sync Now above.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
