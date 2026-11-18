"use client";

import { useEffect, useRef } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { DARK_MAP_STYLE, DEFAULT_MAP_CENTER } from "@/lib/mapStyle";
import { centroid, normalizeDegrees, rectangleCorners, type LatLng } from "@/lib/placementGeometry";
import type { ContainerFootprint } from "@/lib/containerSize";

type Footprint = Pick<ContainerFootprint, "lengthFt" | "widthFt" | "exact">;

// Draws the container as a to-scale rectangle on the satellite photo. It is
// a real map polygon sized in feet, so it keeps its true size as the customer
// zooms, and dragging it (or tapping the map) moves it.
function PlacementShape({
  center,
  rotation,
  footprint,
  placed,
  onMove,
}: {
  center: LatLng;
  rotation: number;
  footprint: Footprint;
  placed: boolean;
  onMove: (point: LatLng) => void;
}) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  });

  useEffect(() => {
    if (!map) return;
    const polygon = new google.maps.Polygon({
      map,
      draggable: true,
      strokeColor: "#431407",
      strokeWeight: 2,
      fillColor: "#f97316",
      fillOpacity: 0.7,
      zIndex: 5,
    });
    polygonRef.current = polygon;

    const dragEnd = polygon.addListener("dragend", () => {
      const corners = polygon
        .getPath()
        .getArray()
        .map((p) => ({ lat: p.lat(), lng: p.lng() }));
      onMoveRef.current(centroid(corners));
    });
    const mapClick = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onMoveRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });

    return () => {
      dragEnd.remove();
      mapClick.remove();
      polygon.setMap(null);
      polygonRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const polygon = polygonRef.current;
    if (!polygon) return;
    polygon.setPaths(rectangleCorners(center, footprint.lengthFt, footprint.widthFt, rotation));
    polygon.setOptions({ fillOpacity: placed ? 0.7 : 0.35 });
  }, [map, center, rotation, footprint.lengthFt, footprint.widthFt, placed]);

  return null;
}

// Moves and zooms the map when the customer's typed address resolves, without
// fighting them afterwards if they pan around on their own.
function Recenter({ target }: { target: LatLng | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    map.setZoom(20);
  }, [map, target?.lat, target?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function formatFeet(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function PlacementMap({
  value,
  rotation,
  onChange,
  onRotationChange,
  center,
  footprint,
  heightClassName = "h-72",
}: {
  value: LatLng | null;
  rotation: number;
  onChange: (point: LatLng) => void;
  onRotationChange: (degrees: number) => void;
  center?: LatLng;
  footprint: Footprint;
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
  const shapeCenter = value ?? mapCenter;
  const turn = (delta: number) => onRotationChange(normalizeDegrees(rotation + delta));

  return (
    <div className="flex flex-col gap-2">
      <div className={`${heightClassName} overflow-hidden rounded-xl border border-zinc-200`}>
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={mapCenter}
            defaultZoom={center ? 20 : 18}
            mapTypeId="satellite"
            gestureHandling="cooperative"
            disableDefaultUI={false}
            styles={DARK_MAP_STYLE}
          >
            <Recenter target={center} />
            <PlacementShape
              center={shapeCenter}
              rotation={rotation}
              footprint={footprint}
              placed={value !== null}
              onMove={onChange}
            />
          </Map>
        </APIProvider>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Turn the dumpster">
        <button
          type="button"
          onClick={() => turn(-15)}
          className="min-h-11 rounded-xl border-2 border-zinc-300 px-4 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          ⟲ Turn left
        </button>
        <button
          type="button"
          onClick={() => turn(15)}
          className="min-h-11 rounded-xl border-2 border-zinc-300 px-4 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Turn right ⟳
        </button>
        <label className="flex min-w-40 flex-1 items-center gap-2 text-xs text-zinc-500">
          <span className="sr-only">Rotation in degrees</span>
          <input
            type="range"
            min={0}
            max={359}
            value={Math.round(rotation)}
            onChange={(e) => onRotationChange(Number(e.target.value))}
            className="w-full accent-orange-600"
          />
        </label>
      </div>

      <p className="text-xs text-zinc-500" aria-live="polite">
        {value
          ? "Drag the orange box to the exact spot, then turn it to match how you want it sitting."
          : "Tap the map or drag the orange box to the spot where you want it."}{" "}
        The box is drawn to size — about {formatFeet(footprint.lengthFt)} × {formatFeet(footprint.widthFt)} ft
        {footprint.exact ? "" : " (approximate)"}.
      </p>
    </div>
  );
}
