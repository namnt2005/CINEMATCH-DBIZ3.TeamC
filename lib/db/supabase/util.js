import { getUserClient } from '../../supabase/server.js';
import { getAdminClient } from '../../supabase/admin.js';

// Shared plumbing of the Supabase source. User client = Row Level Security decides; admin client = System (D2).
export const userDb = () => getUserClient();
export const systemDb = () => getAdminClient();

/** Unwraps a supabase-js result; throws the database error so callers can map it. */
export function rows({ data, error }) {
  if (error) throw Object.assign(new Error(error.message), { code: error.code, cause: error });
  return data;
}

// Embedded one-to-one relations come back as an object or a one-element array depending on the schema cache
export const one = (v) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
