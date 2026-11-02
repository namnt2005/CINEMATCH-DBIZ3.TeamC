// Public queries API (async). node:sqlite or Supabase, chosen by lib/db/source.js (specs/003-sys-core D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/queries.js';

const supabase = () => import('./supabase/queries.js');

export async function sanitizeAndLogQuery(...args) {
  return isSupabase() ? (await supabase()).sanitizeAndLogQuery(...args) : sqlite.sanitizeAndLogQuery(...args);
}
