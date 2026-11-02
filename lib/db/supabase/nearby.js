import { userDb, rows } from './util.js';
import { nearestLocations } from '../geo.js';

export async function getNearbyLocations(locationId, { radiusKm = 30, limit = 5 } = {}) {
  const db = await userDb();
  const origin = rows(await db.from('location').select('lat, lng').eq('location_id', locationId).maybeSingle());
  if (!origin) return [];
  const candidates = rows(await db.from('location').select('location_id, slug, name_en, name_vi, lat, lng')
    .eq('intake_status', 'published').eq('published', true).neq('location_id', locationId));
  return nearestLocations(origin, candidates, { radiusKm, limit });
}
