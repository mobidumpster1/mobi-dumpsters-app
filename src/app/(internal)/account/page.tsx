import { requireUser } from "@/lib/session";
import { Field, inputClass } from "@/components/Field";
import { changeMyPassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { saved, error } = await searchParams;

  return (
    <div className="max-w-md">
      <h1 className="text-3xl font-black tracking-tight text-ink">My Account</h1>

      <section className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Name</dt>
            <dd className="text-zinc-900">{user.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Email</dt>
            <dd className="text-zinc-900">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Role</dt>
            <dd className="capitalize text-zinc-900">{user.role}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
        <h2 className="text-xl font-black text-ink">Change Password</h2>

        {saved && (
          <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            Password updated.
          </p>
        )}
        {error === "wrong_password" && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Current password is incorrect.
          </p>
        )}
        {error === "missing" && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Fill in both fields.
          </p>
        )}

        <form action={changeMyPassword} className="mt-4 flex flex-col gap-4">
          <Field label="Current Password" htmlFor="currentPassword">
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </Field>
          <Field label="New Password" htmlFor="newPassword">
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
          <div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
            >
              Update Password
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
