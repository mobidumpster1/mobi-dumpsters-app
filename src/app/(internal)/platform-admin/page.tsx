import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { startImpersonation } from "./actions";

export const dynamic = "force-dynamic";

// Gated on isPlatformAdmin specifically, not role — this is a support
// capability that cuts across organizations, deliberately separate from
// the owner/staff scale that only ever applies within one organization.
export default async function PlatformAdminPage() {
  const user = await requireUser();
  if (!user.isPlatformAdmin) redirect("/");

  const organizations = await db.organization.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">Platform Admin</h1>
        <p className="mt-1 text-zinc-500">
          Every business using this app. "View As" lets you see the app exactly as that business
          does, for troubleshooting — it's time-limited (4 hours) and logged under your own name,
          not theirs.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Organization</th>
              <th className="px-5 py-3.5 font-semibold">Staff Accounts</th>
              <th className="px-5 py-3.5 font-semibold">Created</th>
              <th className="px-5 py-3.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {organizations.map((org) => (
              <tr key={org.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4 font-medium text-zinc-900">{org.name}</td>
                <td className="px-5 py-4 text-zinc-600">{org._count.users}</td>
                <td className="px-5 py-4 text-zinc-600">
                  {org.createdAt.toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  {org.id === user.organizationId ? (
                    <span className="text-xs text-zinc-400">This is your organization</span>
                  ) : (
                    <form action={startImpersonation.bind(null, org.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        View As
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
