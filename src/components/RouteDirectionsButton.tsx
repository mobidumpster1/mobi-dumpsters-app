// Opens a full multi-stop route in Google Maps, in the given visit order.
// Apple Maps has no equivalent multi-stop URL scheme, so this is
// Google-only (DirectionsButton stays as the single-destination,
// multi-app picker used elsewhere).
export function RouteDirectionsButton({
  origin,
  stops,
  className,
}: {
  origin: { lat: number; lng: number };
  stops: { lat: number; lng: number }[];
  className?: string;
}) {
  if (stops.length === 0) return null;

  const originParam = `${origin.lat},${origin.lng}`;
  const destination = stops[stops.length - 1];
  const destinationParam = `${destination.lat},${destination.lng}`;
  const waypoints = stops
    .slice(0, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", originParam);
  url.searchParams.set("destination", destinationParam);
  if (waypoints) url.searchParams.set("waypoints", waypoints);

  return (
    <a
      href={url.toString()}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
      }
    >
      Open Route in Google Maps
    </a>
  );
}
