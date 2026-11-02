// Public location-detail API (async). node:sqlite or Supabase, chosen by lib/db/source.js (specs/003-sys-core D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/location-detail.js';

const supabase = () => import('./supabase/location-detail.js');

export async function getLocationDetail(...args) {
  return isSupabase() ? (await supabase()).getLocationDetail(...args) : sqlite.getLocationDetail(...args);
}
