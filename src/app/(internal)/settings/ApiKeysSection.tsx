"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { createApiKey, revokeApiKey } from "./apiKeyActions";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

function formatDate(date: Date | null) {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Calls createApiKey directly (not <form action>) so the one-time
// plaintext secret it returns can actually be shown — a redirect-based
// form submission has nowhere to put that.
export function ApiKeysSection({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("name", name);
      const { plaintextKey } = await createApiKey(formData);
      setNewKey(plaintextKey);
      setKeys((prev) => [
        {
          id: crypto.randomUUID(),
          name,
          keyPrefix: plaintextKey.slice(0, 12),
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that key.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">API Access</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Read-only access to your bookings, customers, and equipment availability for a
        third-party tool (Zapier, a partner&apos;s system, a script). Send the key as{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
          Authorization: Bearer &lt;key&gt;
        </code>{" "}
        to <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">/api/v1/bookings</code>,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">/api/v1/customers</code>, or{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
          /api/v1/equipment/availability
        </code>
        .
      </p>

      {newKey && (
        <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">
            Copy this key now — it won&apos;t be shown again.
          </p>
          <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-sm text-zinc-900">
            {newKey}
          </code>
          <button
            type="button"
            onClick={() => setNewKey(null)}
            className="mt-2 text-xs font-semibold text-amber-800 hover:underline"
          >
            I&apos;ve copied it
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Field label="Key Name" htmlFor="apiKeyName">
            <input
              id="apiKeyName"
              placeholder="e.g. Zapier"
              required
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {creating ? "Generating…" : "+ Generate Key"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {keys.map((key) => (
          <div
            key={key.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink">{key.name}</span>
                {key.revokedAt && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
                    Revoked
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                <code>{key.keyPrefix}…</code> · Created {formatDate(key.createdAt)} · Last used{" "}
                {formatDate(key.lastUsedAt)}
              </p>
            </div>
            {!key.revokedAt && (
              <form
                action={async () => {
                  await revokeApiKey(key.id);
                  setKeys((prev) =>
                    prev.map((k) => (k.id === key.id ? { ...k, revokedAt: new Date() } : k))
                  );
                }}
              >
                <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
                  Revoke
                </button>
              </form>
            )}
          </div>
        ))}
        {keys.length === 0 && <p className="text-sm text-zinc-400">No API keys yet.</p>}
      </div>
    </section>
  );
}
