// Public admin-locations API (async). node:sqlite or Supabase, chosen by lib/db/source.js (specs/003-sys-core D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/admin-locations.js';

const supabase = () => import('./supabase/admin-locations.js');

export { STATUSES } from './admin-shape.js';

export async function countLocationsByStatus(...args) {
  return isSupabase() ? (await supabase()).countLocationsByStatus(...args) : sqlite.countLocationsByStatus(...args);
}

export async function listAdminLocations(...args) {
  return isSupabase() ? (await supabase()).listAdminLocations(...args) : sqlite.listAdminLocations(...args);
}

export async function getAdminLocation(...args) {
  return isSupabase() ? (await supabase()).getAdminLocation(...args) : sqlite.getAdminLocation(...args);
}

export async function createLocation(...args) {
  return isSupabase() ? (await supabase()).createLocation(...args) : sqlite.createLocation(...args);
}

export async function updateLocation(...args) {
  return isSupabase() ? (await supabase()).updateLocation(...args) : sqlite.updateLocation(...args);
}

export async function saveAuthorityContact(...args) {
  return isSupabase() ? (await supabase()).saveAuthorityContact(...args) : sqlite.saveAuthorityContact(...args);
}

export async function verifyAuthorityContact(...args) {
  return isSupabase() ? (await supabase()).verifyAuthorityContact(...args) : sqlite.verifyAuthorityContact(...args);
}

export async function publishLocation(...args) {
  return isSupabase() ? (await supabase()).publishLocation(...args) : sqlite.publishLocation(...args);
}

export async function unpublishLocation(...args) {
  return isSupabase() ? (await supabase()).unpublishLocation(...args) : sqlite.unpublishLocation(...args);
}
