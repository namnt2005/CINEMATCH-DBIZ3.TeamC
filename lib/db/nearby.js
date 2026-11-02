// Public nearby API (async). node:sqlite or Supabase, chosen by lib/db/source.js (specs/003-sys-core D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/nearby.js';

const supabase = () => import('./supabase/nearby.js');

export { haversineKm } from './geo.js';

export async function getNearbyLocations(...args) {
  return isSupabase() ? (await supabase()).getNearbyLocations(...args) : sqlite.getNearbyLocations(...args);
}
