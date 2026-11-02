// Distance helpers shared by both data sources (F-M3-14).

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance in km between two { lat, lng } points.
 */
export function haversineKm(a, b) {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Nearest published candidates to an origin: within radiusKm, closest first, at most limit (F-M3-14, SC-16 #12).
 */
export function nearestLocations(origin, candidates, { radiusKm = 30, limit = 5 } = {}) {
  return candidates
    .map(loc => ({
      location_id: loc.location_id,
      slug: loc.slug,
      name_en: loc.name_en,
      name_vi: loc.name_vi,
      coordinates: { lat: Number(loc.lat), lng: Number(loc.lng) },
      distance_km: Math.round(haversineKm(origin, loc) * 100) / 100
    }))
    .filter(loc => loc.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);
}
