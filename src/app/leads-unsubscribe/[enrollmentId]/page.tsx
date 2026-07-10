import { db } from "@/lib/db";
import { branding } from "@/lib/branding";

export const dynamic = "force-dynamic";

// Reached from the unsubscribe link in a sequence email — public, no
// login. Opting out stops every active sequence for this lead, not just
// the one the email came from, since the point is "stop emailing me."
export default async function LeadUnsubscribePage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;

  const enrollment = await db.leadSequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { lead: true },
  });

  if (enrollment) {
    await db.lead.update({
      where: { id: enrollment.leadId },
      data: { emailOptOut: true },
    });
    await db.leadSequenceEnrollment.updateMany({
      where: { leadId: enrollment.leadId, status: "active" },
      data: { status: "stopped", stoppedReason: "unsubscribed", nextDueAt: null },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-ink">
          {enrollment ? "You're unsubscribed" : "Link no longer valid"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {enrollment
            ? `You won't receive any more automated emails from ${branding.businessName}.`
            : "This unsubscribe link isn't recognized — you may have already been unsubscribed."}
        </p>
      </div>
    </div>
  );
}
