import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={`rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold transition-colors ${
          page <= 1 ? "pointer-events-none text-zinc-300" : "text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        Previous
      </Link>
      <span className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        className={`rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold transition-colors ${
          page >= totalPages ? "pointer-events-none text-zinc-300" : "text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        Next
      </Link>
    </div>
  );
}
