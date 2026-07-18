"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { ConfirmButton } from "@/components/ConfirmButton";
import { updateTimeEntry, deleteTimeEntry } from "@/app/(internal)/time/actions";
import { formatDateAndTime } from "@/lib/date";

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function TimeEntryRow({
  entry,
  canEdit,
}: {
  entry: {
    id: string;
    userName: string;
    clockIn: Date;
    clockOut: Date | null;
    hours: number | null;
    notes: string | null;
    bookingLabel: string | null;
    showUser: boolean;
  };
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateTimeEntry(entry.id, new FormData(e.currentTarget));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteTimeEntry(entry.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that entry.");
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-lg border-2 border-brand bg-white p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Clock In" htmlFor={`clockIn-${entry.id}`}>
            <input
              id={`clockIn-${entry.id}`}
              name="clockIn"
              type="datetime-local"
              required
              defaultValue={toDateTimeLocal(entry.clockIn)}
              className={inputClass}
            />
          </Field>
          <Field label="Clock Out" htmlFor={`clockOut-${entry.id}`}>
            <input
              id={`clockOut-${entry.id}`}
              name="clockOut"
              type="datetime-local"
              defaultValue={entry.clockOut ? toDateTimeLocal(entry.clockOut) : ""}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Notes" htmlFor={`notes-${entry.id}`}>
          <input
            id={`notes-${entry.id}`}
            name="notes"
            defaultValue={entry.notes ?? ""}
            className={inputClass}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border-2 border-zinc-900 bg-white p-4">
      <div className="min-w-0">
        {entry.showUser && <p className="text-sm font-semibold text-zinc-900">{entry.userName}</p>}
        <p className="text-sm text-zinc-700">
          {formatDateAndTime(entry.clockIn)}
          {entry.clockOut ? ` – ${formatDateAndTime(entry.clockOut)}` : " – in progress"}
        </p>
        <p className="text-sm text-zinc-500">
          {entry.hours != null ? `${entry.hours.toFixed(2)} hrs` : "—"}
          {entry.bookingLabel ? ` · ${entry.bookingLabel}` : ""}
        </p>
        {entry.notes && <p className="mt-1 text-sm text-zinc-600">{entry.notes}</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      {canEdit && (
        <div className="flex flex-shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Edit
          </button>
          <ConfirmButton
            message="Delete this time entry? This can't be undone."
            className="text-xs font-semibold text-red-600 hover:underline"
            onClick={handleDelete}
          >
            Delete
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
