export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getRingForDistance(km: number): number {
  if (km <= 0.5) return 1;
  if (km <= 1) return 2;
  if (km <= 1.5) return 3;
  if (km <= 2) return 4;
  if (km <= 3.5) return 5;
  return 6;
}

export function getRingLabel(ring: number): string {
  switch (ring) {
    case 1:
      return "0 - 1 km";
    case 2:
      return "1 - 3 km";
    case 3:
      return "3 - 5 km";
    case 4:
      return "5+ km";
    default:
      return "";
  }
}
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export interface Box {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** A square of roughly `km` around a point, for filtering in the database before sorting. */
export function boundingBox(lat: number, lng: number, km: number): Box {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

/** Adds the box to a Supabase query (no-op when box is null). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withinBox<Q extends { gte: any; lte: any }>(q: Q, box: Box | null): Q {
  if (!box) return q;
  return q.gte("latitude", box.minLat).lte("latitude", box.maxLat).gte("longitude", box.minLng).lte("longitude", box.maxLng);
}

/**
 * Nearest-first fetch: asks the database for people inside ~30 km first, so a
 * row limit can't cut out the closest ones. Widens to everywhere only when
 * the area has too few results.
 */
export async function nearestFirst<T extends { id: string }>(
  lat: number,
  lng: number,
  run: (box: Box | null) => PromiseLike<{ data: T[] | null }>,
  want = 15,
): Promise<T[]> {
  const near = (await run(boundingBox(lat, lng, 30))).data ?? [];
  if (near.length >= want) return near;
  const wide = (await run(null)).data ?? [];
  const seen = new Set(near.map((r) => r.id));
  return [...near, ...wide.filter((r) => !seen.has(r.id))];
}

/** True when two points are more than `km` apart (used to decide when to search again). */
export function movedMoreThan(a: { lat: number; lng: number } | null, lat: number, lng: number, km: number): boolean {
  return !a || haversineDistance(a.lat, a.lng, lat, lng) > km;
}
