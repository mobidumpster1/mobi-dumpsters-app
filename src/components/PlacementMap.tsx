"use client";

import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { DARK_MAP_STYLE, DEFAULT_MAP_CENTER, dumpsterPinIcon } from "@/lib/mapStyle";

type LatLng = { lat: number; lng: number };

// Draggable version of LocationMap for the public checkout flow — lets a
// customer drop a dumpster-icon pin on the exact spot they want it placed,
// separate from (and more precise than) their typed delivery address.
export function PlacementMap({
  value,
  onChange,
  center,
  heightClassName = "h-64",
}: {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  center?: LatLng;
  heightClassName?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div
        className={`flex ${heightClassName} items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-6 text-center text-sm text-zinc-400`}
      >
        Map view isn&apos;t set up yet — you can still book, we&apos;ll confirm placement with you directly.
      </div>
    );
  }

  const mapCenter = center ?? DEFAULT_MAP_CENTER;
  const pinPoint = value ?? mapCenter;

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`${heightClassName} overflow-hidden rounded-lg border border-zinc-200`}>
        <APIProvider apiKey={apiKey}>
          <Map
            center={mapCenter}
            defaultZoom={18}
            mapTypeId="satellite"
            gestureHandling="cooperative"
            disableDefaultUI={false}
            styles={DARK_MAP_STYLE}
            onClick={(e) => {
              if (e.detail.latLng) onChange({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
            }}
          >
            <Marker
              position={pinPoint}
              icon={dumpsterPinIcon("#c2410c", "#7c2d12")}
              opacity={value ? 1 : 0.55}
              draggable
              onDragEnd={(e) => {
                if (e.latLng) onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
              }}
            />
          </Map>
        </APIProvider>
      </div>
      <p className="text-xs text-zinc-500">
        {value
          ? "Drag the dumpster icon if you'd like it somewhere else."
          : "Drag the dumpster icon to the exact spot, or tap the map."}
      </p>
    </div>
  );
}
