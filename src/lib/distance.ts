const EARTH_RADIUS_MILES = 3958.8;

// Straight-line (not driving) distance — good enough for an "is this lead
// roughly in range" flag, without needing a Directions API call per lead.
export function milesBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

// Real driving distance via Google's Routes API — used only where the
// number directly drives a dollar amount (the material-delivery mileage
// fee), since straight-line is 15-30% short of actual road distance in
// practice and that gap is real money on a per-mile surcharge. Everywhere
// else that just needs "is this roughly in range" (lead flagging, route
// ordering) stays on the free, no-API milesBetween above.
// Returns null (not a fallback estimate) on any failure — the caller
// falls back to milesBetween itself, same "under-quote rather than block
// a booking" philosophy already used for delivery pricing.
export async function drivingMilesBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: lat1, longitude: lng1 } } },
        destination: { location: { latLng: { latitude: lat2, longitude: lng2 } } },
        travelMode: "DRIVE",
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const meters = data?.routes?.[0]?.distanceMeters;
    return typeof meters === "number" ? meters / 1609.34 : null;
  } catch {
    return null;
  }
}
