"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Template = { id: string; name: string };

export function SendTemplatedEmailButton({
  id,
  templates,
  action,
  idleLabel = "Send",
  busyLabel = "Sending…",
  emptyLabel = "No templates yet",
  errorFallback = "Couldn't send that email",
}: {
  id: string;
  templates: Template[];
  action: (id: string, templateId: string) => Promise<void>;
  idleLabel?: string;
  busyLabel?: string;
  emptyLabel?: string;
  errorFallback?: string;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (templates.length === 0) {
    return <span className="text-xs text-zinc-400">{emptyLabel}</span>;
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await action(id, templateId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : errorFallback);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-base text-zinc-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:text-xs"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="flex-shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {sending ? busyLabel : idleLabel}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
