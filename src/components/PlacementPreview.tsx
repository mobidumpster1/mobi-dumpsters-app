"use client";

import { useEffect } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { DARK_MAP_STYLE } from "@/lib/mapStyle";
import { rectangleCorners, type LatLng } from "@/lib/placementGeometry";

function StaticShape({
  center,
  rotation,
  lengthFt,
  widthFt,
}: {
  center: LatLng;
  rotation: number;
  lengthFt: number;
  widthFt: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const polygon = new google.maps.Polygon({
      map,
      paths: rectangleCorners(center, lengthFt, widthFt, rotation),
      strokeColor: "#431407",
      strokeWeight: 2,
      fillColor: "#f97316",
      fillOpacity: 0.7,
      clickable: false,
    });
    return () => polygon.setMap(null);
  }, [map, center, rotation, lengthFt, widthFt]);
  return null;
}

// Read-only satellite close-up of where the customer asked for the container,
// drawn to size and turned the way they set it — what a driver needs to see
// before backing a trailer onto someone's driveway.
export function PlacementPreview({
  lat,
  lng,
  rotation,
  lengthFt,
  widthFt,
  heightClassName = "h-64",
}: {
  lat: number;
  lng: number;
  rotation: number;
  lengthFt: number;
  widthFt: number;
  heightClassName?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  const center = { lat, lng };

  return (
    <div className={`${heightClassName} overflow-hidden rounded-lg border border-zinc-200`}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={20}
          mapTypeId="satellite"
          gestureHandling="cooperative"
          disableDefaultUI={false}
          styles={DARK_MAP_STYLE}
        >
          <StaticShape center={center} rotation={rotation} lengthFt={lengthFt} widthFt={widthFt} />
        </Map>
      </APIProvider>
    </div>
  );
}
