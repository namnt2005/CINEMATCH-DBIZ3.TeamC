import { toBool, toNumber, toArray, toText } from './row-values.js';
import { removeDiacritics } from './search-core.js';
import { BLOCKED_REASON } from '../admin/errors.js';

// SC-35 row shapes shared by lib/db/sqlite/admin-locations.js and lib/db/supabase/admin-locations.js.

export const STATUSES = ['awaiting_contact', 'published', 'unpublished'];
export const ARRAY_FIELDS = ['scene_types', 'months_to_avoid', 'rainy_months'];
export const BOOL_FIELDS = ['lodging_20km', 'grid_power', 'truck_access'];

// ---- conversions between the stored row (seed text) and the API values ---------------------

export function fieldFromRow(field, raw) {
  if (ARRAY_FIELDS.includes(field)) return field === 'scene_types' ? toArray(raw) || [] : toArray(raw);
  if (BOOL_FIELDS.includes(field)) return toBool(raw);
  if (['province_id', 'lat', 'lng', 'airport_km'].includes(field)) return toNumber(raw);
  return toText(raw);
}

export const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function slugFrom(nameEn) {
  return removeDiacritics(nameEn).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160).replace(/-+$/, '');
}

// SC-35 #23: why Publish is disabled. A location that is not published and whose contact is not
// verified always shows the BR-004 reason; otherwise the stored reason (e.g. why it was unpublished).
export function blockedReason(row, contactVerified) {
  if (row.intake_status !== 'published' && !contactVerified) return BLOCKED_REASON;
  return toText(row.blocked_reason);
}

