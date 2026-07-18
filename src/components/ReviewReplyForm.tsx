"use client";

import { useState } from "react";
import { replyToReview } from "@/app/(internal)/reviews/actions";
import { inputClass } from "@/components/Field";

// Calls replyToReview directly (not via <form action>) so a failure shows
// a friendly inline error instead of crashing to Next's generic error
// page — the established fix for any form wired to a throwing action.
export function ReviewReplyForm({
  reviewId,
  existingReply,
}: {
  reviewId: string;
  existingReply: string | null;
}) {
  const [comment, setComment] = useState(existingReply ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("comment", comment);
      await replyToReview(reviewId, formData);
      setPosted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post that reply.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Write a reply…"
        className={inputClass}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {posted && <p className="text-sm text-green-700">Reply posted.</p>}
      <div>
        <button
          type="submit"
          disabled={saving || !comment.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Posting…" : existingReply ? "Update Reply" : "Post Reply"}
        </button>
      </div>
    </form>
  );
}
