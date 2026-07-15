"use client";

import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { useRouter } from "next/navigation";
import { DARK_MAP_STYLE, numberedPinIcon } from "@/lib/mapStyle";

export type LocationMapPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  href: string;
};

// Byron, GA — used as a fallback center when there are no pins to show.
const DEFAULT_CENTER = { lat: 32.6459, lng: -83.7466 };

export function LocationMap({
  pins,
  heightClassName = "h-80",
  zoom,
}: {
  pins: LocationMapPin[];
  heightClassName?: string;
  zoom?: number;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const router = useRouter();

  if (!apiKey) {
    return (
      <div
        className={`flex ${heightClassName} items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-6 text-center text-sm text-zinc-400`}
      >
        Map view isn&apos;t set up yet — add a Google Maps API key to see
        locations here.
      </div>
    );
  }

  const center = pins.length > 0 ? { lat: pins[0].lat, lng: pins[0].lng } : DEFAULT_CENTER;
  const defaultZoom = zoom ?? (pins.length > 0 ? 11 : 10);

  return (
    <div className={`${heightClassName} overflow-hidden rounded-lg border border-zinc-200`}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={defaultZoom}
          mapTypeId="satellite"
          // "cooperative" (not "greedy") so a one-finger swipe scrolls the
          // page like normal — this map is embedded among other content on
          // every page it's used, not a full-screen standalone map. Greedy
          // made the map swallow single-finger scrolls/pinches meant for
          // the page, which read as "zoom is weird" on mobile.
          gestureHandling="cooperative"
          disableDefaultUI={false}
          styles={DARK_MAP_STYLE}
        >
          {pins.map((pin, index) => (
            <Marker
              key={pin.id}
              position={{ lat: pin.lat, lng: pin.lng }}
              title={pin.label}
              icon={numberedPinIcon(index + 1, "#3f6b2f", "#2f5122")}
              onClick={() => router.push(pin.href)}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
