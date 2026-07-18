import { milesBetween } from "@/lib/distance";

export type RouteStop = { id: string; lat: number; lng: number };

// Greedy nearest-neighbor ordering — from the current point, repeatedly
// visit whichever remaining stop is closest (straight-line, same
// approximation milesBetween already uses for delivery-mileage pricing).
// Not a true shortest-route solver, but a free, no-API "good enough"
// ordering for a truck doing a handful of stops in a day.
export function nearestNeighborRoute(start: { lat: number; lng: number }, stops: RouteStop[]): string[] {
  const remaining = [...stops];
  const order: string[] = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const distance = milesBetween(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    const [next] = remaining.splice(nearestIndex, 1);
    order.push(next.id);
    current = next;
  }

  return order;
}
