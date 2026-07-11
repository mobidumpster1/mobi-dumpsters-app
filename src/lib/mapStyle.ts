// Shared Google Maps dark theme + marker icon helper, used by the real
// LocationMap component and (for consistency) the design-preview mockups.
// Only affects roadmap tiles — satellite/hybrid imagery is unstyled photos
// and ignores this regardless.

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
