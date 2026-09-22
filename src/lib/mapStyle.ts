// Google Maps dark theme + marker icon helper for LocationMap. Only
// affects roadmap tiles — satellite/hybrid imagery is unstyled photos and
// ignores this regardless.

// Byron, GA — fallback map center when there's nothing else to center on.
// Shared by LocationMap and PlacementMap so they don't each hardcode it.
export const DEFAULT_MAP_CENTER = { lat: 32.6459, lng: -83.7466 };

export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0a0f14" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f14" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#71717a" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#a1a1aa" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#71717a" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f1a13" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#3f6b52" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#17202b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0a0f14" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#52525b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#22303e" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#8a94a6" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#17202b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#08131a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a5a68" }] },
];

// A colored teardrop pin with a white number, replacing the old
// AdvancedMarker+Pin combo — that approach required a Map ID, and Map IDs
// use cloud-based styling that ignores the local `styles` array above, so
// switching to a classic Marker + data-URI icon is what makes the dark
// theme possible without a Google Cloud Console dependency.
export function numberedPinIcon(number: number, background: string, borderColor: string): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
    <path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill="${background}" stroke="${borderColor}" stroke-width="1.5"/>
    <text x="13" y="18" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#ffffff">${number}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  };
}

// Same teardrop pin shape/size as numberedPinIcon (so it sits consistently
// among other map pins) with a low, rectangular roll-off container glyph
// instead of a number — used to mark a customer's exact drop-off spot.
export function dumpsterPinIcon(background: string, borderColor: string): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
    <path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill="${background}" stroke="${borderColor}" stroke-width="1.5"/>
    <rect x="5" y="19" width="3" height="1.6" fill="#ffffff"/>
    <rect x="18" y="19" width="3" height="1.6" fill="#ffffff"/>
    <rect x="5.5" y="12.5" width="15" height="7" fill="#ffffff" stroke="${background}" stroke-width="0.6"/>
    <rect x="4.5" y="11" width="17" height="1.8" fill="#ffffff"/>
    <path d="M9.5 12.8v6.4M13 12.8v6.4M16.5 12.8v6.4" stroke="${background}" stroke-width="0.8"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  };
}
