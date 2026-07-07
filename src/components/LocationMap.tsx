"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { useRouter } from "next/navigation";

// Falls back to Google's shared demo Map ID (fine for development, but shows
// a "for development purposes only" watermark) until a real one is created
// in Google Cloud Console — Maps Platform → Map Management → Create Map ID
// — and set as NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

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
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={defaultZoom}
          mapTypeId="satellite"
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {pins.map((pin, index) => (
            <AdvancedMarker
              key={pin.id}
              position={{ lat: pin.lat, lng: pin.lng }}
              title={pin.label}
              onClick={() => router.push(pin.href)}
            >
              <Pin
                glyph={String(index + 1)}
                glyphColor="#ffffff"
                background="#3f6b2f"
                borderColor="#2f5122"
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
