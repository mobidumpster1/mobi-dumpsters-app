import { describe, expect, it } from "vitest";
import { centroid, normalizeDegrees, rectangleCorners } from "@/lib/placementGeometry";
import { containerFootprint } from "@/lib/containerSize";

const center = { lat: 32.6459, lng: -83.7466 };
const M_PER_DEG_LAT = 111_320;

function spans(corners: { lat: number; lng: number }[]) {
  const lats = corners.map((c) => c.lat);
  const lngs = corners.map((c) => c.lng);
  const northSouthM = (Math.max(...lats) - Math.min(...lats)) * M_PER_DEG_LAT;
  const eastWestM =
    (Math.max(...lngs) - Math.min(...lngs)) * M_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180);
  return { northSouthM, eastWestM };
}

describe("rectangleCorners", () => {
  it("at 0 degrees a 22 x 8 ft box is long north-south", () => {
    const { northSouthM, eastWestM } = spans(rectangleCorners(center, 22, 8, 0));
    expect(northSouthM).toBeCloseTo(22 * 0.3048, 2);
    expect(eastWestM).toBeCloseTo(8 * 0.3048, 2);
  });

  it("at 90 degrees it is long east-west", () => {
    const { northSouthM, eastWestM } = spans(rectangleCorners(center, 22, 8, 90));
    expect(eastWestM).toBeCloseTo(22 * 0.3048, 2);
    expect(northSouthM).toBeCloseTo(8 * 0.3048, 2);
  });

  it("stays centered on the point it was built around", () => {
    const c = centroid(rectangleCorners(center, 22, 8, 37));
    expect(c.lat).toBeCloseTo(center.lat, 9);
    expect(c.lng).toBeCloseTo(center.lng, 9);
  });

  it("keeps a constant diagonal at any rotation", () => {
    const diag = (deg: number) => {
      const [a, , c] = rectangleCorners(center, 22, 8, deg);
      const dLat = (a.lat - c.lat) * M_PER_DEG_LAT;
      const dLng = (a.lng - c.lng) * M_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180);
      return Math.hypot(dLat, dLng);
    };
    expect(diag(0)).toBeCloseTo(diag(63), 4);
  });
});

describe("normalizeDegrees", () => {
  it("wraps into 0-359", () => {
    expect(normalizeDegrees(375)).toBe(15);
    expect(normalizeDegrees(-15)).toBe(345);
    expect(normalizeDegrees(0)).toBe(0);
  });
});

describe("containerFootprint", () => {
  it("prefers the category's own dimensions and treats the larger number as length", () => {
    expect(containerFootprint({ name: "Utility Trailer", dimensions: "6’W x 12’ L", bundleQuantity: null })).toEqual({
      lengthFt: 12,
      widthFt: 6,
      exact: true,
    });
  });

  it("guesses from the yard size in the name when there are no dimensions", () => {
    const f = containerFootprint({ name: "20 Yard Dumpster", dimensions: null, bundleQuantity: null });
    expect(f).toEqual({ lengthFt: 22, widthFt: 8, exact: false });
  });

  it("draws a bundle side by side, sizing each container from its share", () => {
    const f = containerFootprint({ name: "40 Yard — Two Containers", dimensions: null, bundleQuantity: 2 });
    expect(f.lengthFt).toBe(22);
    expect(f.widthFt).toBe(16);
    expect(f.exact).toBe(false);
  });
});
