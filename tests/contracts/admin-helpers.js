// Shared helpers for the US-3 admin contract tests (not a test file: it does not end in .test.js).
import { getDb, closeDatabase } from '../../lib/db/client.js';

export const STAFF_ID = '515529a9-46d9-559c-aab4-e5fb31eedeea'; // default mock vfda_staff (research R3, Open question 1)
export const MUI_NE = '162abff9-9986-52d0-80a6-75fd4e7403f5'; // awaiting_contact, contact not verified
export const TRANG_AN = '607132bd-b05b-52c6-900f-5f2928c17a9e'; // published, contact verified
export const CUA_VAN = 'ae2760b4-7a9b-5528-a202-39e5a1d456f0'; // unpublished, contact verified

// Route modules of contracts/admin-locations.contract.md, imported per call so each test
// reports its own failure until the module exists.
export const ROUTES = {
  list: '../../app/api/admin/locations/route.js',
  one: '../../app/api/admin/locations/[id]/route.js',
  contact: '../../app/api/admin/locations/[id]/authority-contact/route.js',
  verify: '../../app/api/admin/locations/[id]/authority-contact/verify/route.js',
  publish: '../../app/api/admin/locations/[id]/publish/route.js',
  unpublish: '../../app/api/admin/locations/[id]/unpublish/route.js'
};

/** Every test starts from the clean seed (decision D1: in-memory database). */
export function freshDatabase() {
  closeDatabase();
}

/**
 * Calls one admin Route Handler.
 * @param {'list'|'one'|'contact'|'verify'|'publish'|'unpublish'} route
 * @param {string} method GET | POST | PUT | DELETE
 * @param {{ id?: string, role?: string|null, body?: object, query?: string }} [options] role null = no header
 */
export async function callAdmin(route, method, { id, role = 'vfda_staff', body, query = '' } = {}) {
  const mod = await import(ROUTES[route]);
  const headers = { 'Content-Type': 'application/json' };
  if (role) headers['x-mock-role'] = role;
  const path = id ? `/api/admin/locations/${id}` : '/api/admin/locations';
  const req = new Request(`http://localhost:3000${path}${query}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return mod[method](req, { params: id ? { id } : {} });
}

export async function callPublic(slug, { role, contact = false } = {}) {
  const mod = await import(contact
    ? '../../app/api/locations/[slug]/authority-contact/route.js'
    : '../../app/api/locations/[slug]/route.js');
  const headers = role ? { 'x-mock-role': role } : {};
  const url = `http://localhost:3000/api/locations/${slug}${contact ? '/authority-contact' : ''}`;
  return mod.GET(new Request(url, { headers }), { params: { slug } });
}

/** Audit rows for one target, optionally of one action. */
export function auditRows(targetId, action) {
  const rows = getDb()
    .prepare('SELECT audit_log_id, action, admin_id, target_id, logged_at FROM audit_log WHERE target_id = ?')
    .all(targetId);
  return action ? rows.filter(r => r.action === action) : rows;
}

export function locationRow(id) {
  return getDb().prepare('SELECT * FROM location WHERE location_id = ?').get(id);
}

/** The 20 fields of FR-002 (contract §3 example). */
export function validLocationBody(overrides = {}) {
  return {
    name_vi: 'Đầm Vân Long',
    name_en: 'Van Long Wetland Nature Reserve',
    province_id: 19,
    district: 'Gia Viễn',
    lat: 20.354,
    lng: 105.867,
    airport_km: 100,
    scene_types: ['karst', 'river', 'floating_village'],
    desc_vi: 'Khu bảo tồn đất ngập nước.',
    desc_en: 'A wetland nature reserve.',
    crew_capacity: '15_50',
    lodging_20km: true,
    grid_power: true,
    truck_access: true,
    months_to_avoid: [7, 8],
    permit_complexity: 'medium',
    restriction_note: 'Protected langur habitat.',
    availability: 'open',
    night_shooting_allowed: 'ask',
    rainy_months: [6, 7, 8],
    ...overrides
  };
}

export const VALID_CONTACT = {
  authority_name: 'Ban Quản lý Khu bảo tồn Vân Long',
  contact_name: 'Trần Thị Mai',
  contact_phone: '+84 000 000 120',
  contact_email: null
};
