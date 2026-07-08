// A small "Get Directions" control that lets you pick which maps app to
// open the address in, since Google Maps' web link doesn't reliably jump
// into the native Google Maps app, and does nothing for someone who uses
// Apple Maps. Pure <details>/<summary> — no JS needed for the dropdown.
export function DirectionsButton({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  const encoded = encodeURIComponent(address);

  return (
    <details className="relative inline-block [&_summary::-webkit-details-marker]:hidden">
      <summary
        className={
          className ??
          "list-none cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        }
      >
        Get Directions
      </summary>
      <div className="absolute left-0 z-10 mt-1 flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Open in Google Maps
        </a>
        <a
          href={`https://maps.apple.com/?daddr=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap border-t border-zinc-100 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Open in Apple Maps
        </a>
      </div>
    </details>
  );
}
