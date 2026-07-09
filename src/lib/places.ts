export type PlaceResult = {
  placeId: string;
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  category: string | null;
  rating: number | null;
};

// Searches Google Places (New) Text Search for businesses matching a
// free-text query (e.g. "general contractors near Byron, GA"). Requests
// phone/website/rating, which puts every call on the Enterprise SKU rather
// than the cheaper Pro tier — but outreach is useless without a phone
// number, so there's no cheaper tier that actually serves this feature.
// Returns [] (instead of throwing) if no API key is configured or the
// request fails, matching the non-fatal pattern used by geocodeAddress.
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !query.trim()) return [];

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.primaryTypeDisplayName",
      },
      body: JSON.stringify({ textQuery: query }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    const places = Array.isArray(data?.places) ? data.places : [];

    return places.map(
      (p: {
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        nationalPhoneNumber?: string;
        websiteUri?: string;
        rating?: number;
        primaryTypeDisplayName?: { text?: string };
      }) => ({
        placeId: p.id,
        name: p.displayName?.text ?? "Unnamed business",
        phone: p.nationalPhoneNumber ?? null,
        address: p.formattedAddress ?? null,
        website: p.websiteUri ?? null,
        category: p.primaryTypeDisplayName?.text ?? null,
        rating: typeof p.rating === "number" ? p.rating : null,
      })
    );
  } catch {
    return [];
  }
}
