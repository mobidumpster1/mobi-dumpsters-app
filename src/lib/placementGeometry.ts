export type LatLng = { lat: number; lng: number };

const FT_TO_M = 0.3048;
const M_PER_DEG_LAT = 111_320;

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

// The four corners of a lengthFt x widthFt rectangle centered on `center`, its
// long side pointing `rotationDeg` degrees clockwise from north (0 = long side
// runs north-south, 90 = east-west). Plain flat-earth offsets, which are
// accurate to well under an inch at the size of a dumpster.
export function rectangleCorners(
  center: LatLng,
  lengthFt: number,
  widthFt: number,
  rotationDeg: number
): LatLng[] {
  const halfLength = (lengthFt * FT_TO_M) / 2;
  const halfWidth = (widthFt * FT_TO_M) / 2;
  const theta = (rotationDeg * Math.PI) / 180;
  const along = { east: Math.sin(theta), north: Math.cos(theta) };
  const across = { east: Math.cos(theta), north: -Math.sin(theta) };
  const metersPerDegLng = M_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180);

  return (
    [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ] as const
  ).map(([a, b]) => {
    const east = a * halfLength * along.east + b * halfWidth * across.east;
    const north = a * halfLength * along.north + b * halfWidth * across.north;
    return { lat: center.lat + north / M_PER_DEG_LAT, lng: center.lng + east / metersPerDegLng };
  });
}

export function centroid(points: LatLng[]): LatLng {
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}
