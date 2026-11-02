// Public search API (async). node:sqlite or Supabase, chosen by lib/db/source.js (specs/003-sys-core D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/search.js';

const supabase = () => import('./supabase/search.js');

export { removeDiacritics, resolveProvinceInput, buildSearchQueryFilter } from './search-core.js';

export async function searchLocations(...args) {
  return isSupabase() ? (await supabase()).searchLocations(...args) : sqlite.searchLocations(...args);
}
