/*
 * Seed rows come from CSV, so booleans, numbers and arrays arrive as text.
 * Empty values stay null: "no data yet" is not the same as false or [] (BR-003).
 * Shared by the public read models (location-detail.js) and the admin ones (admin-locations.js).
 */

export function toBool(v) {
  if (v === true || v === 1 || v === 'true' || v === '1') return true;
  if (v === false || v === 0 || v === 'false' || v === '0') return false;
  return null;
}

export function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function toArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string' || v.trim() === '') return null;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function toText(v) {
  return v === null || v === undefined || v === '' ? null : v;
}
