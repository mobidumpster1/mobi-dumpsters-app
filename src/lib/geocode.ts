type GeocodeResult = { latitude: number; longitude: number } | null;

// Converts a street address into map coordinates using Google's Geocoding
// API. Returns null (instead of throwing) if no API key is configured yet,
// or if the address can't be found — callers should treat a missing pin as
// a non-fatal, expected state, not an error.
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address.trim()) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const data = await response.json();
    const location = data?.results?.[0]?.geometry?.location;
    if (typeof location?.lat !== "number" || typeof location?.lng !== "number") {
      return null;
    }
    return { latitude: location.lat, longitude: location.lng };
  } catch {
    return null;
  }
}
