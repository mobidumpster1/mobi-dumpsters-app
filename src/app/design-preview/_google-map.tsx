"use client";

// TEMPORARY design-exploration mockup — see ./_shared.tsx for cleanup notes.
// The real Google Maps embed (same library the actual app uses in
// src/components/LocationMap.tsx), dark-styled to match the app instead of
// sitting as a bright default-styled box. Markers use the same accent
// colors as the rest of the mockup instead of default red pins.

import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { DARK_MAP_STYLE } from "@/lib/mapStyle";

export type GoogleMapPin = {
  label: string;
  tag?: string;
  lat: number;
  lng: number;
  color: "cyan" | "emerald" | "violet" | "amber";
  pulse?: boolean;
};

const PIN_HEX: Record<string, string> = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  violet: "#a78bfa",
  amber: "#fbbf24",
};

function markerIcon(hex: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><circle cx="13" cy="13" r="7" fill="${hex}" stroke="#05070a" stroke-width="2"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: 26, height: 26 } as google.maps.Size,
  };
}

// Byron, GA — matches DEFAULT_CENTER in the real app's LocationMap.tsx.
const CENTER = { lat: 32.6459, lng: -83.7466 };

export function GoogleMapPanel({
  pins,
  className = "h-72",
  dark = true,
  borderClassName = "border-white/5",
}: {
  pins: GoogleMapPin[];
  className?: string;
  dark?: boolean;
  borderClassName?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className={`flex ${className} items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-sm text-zinc-500`}>
        No Google Maps API key configured.
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden rounded-lg border ${borderClassName}`}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={CENTER}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          styles={dark ? DARK_MAP_STYLE : undefined}
        >
          {pins.map((pin) => (
            <Marker
              key={pin.label}
              position={{ lat: pin.lat, lng: pin.lng }}
              title={pin.label}
              icon={markerIcon(PIN_HEX[pin.color])}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
