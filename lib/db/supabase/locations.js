import { userDb, systemDb, rows, one } from './util.js';

// Same row shape as lib/db/sqlite/locations.js: location columns + province_name / province_slug / province_region.
const WITH_PROVINCE = '*, province:province_id(name, slug, region)';

function flatten(row) {
  if (!row) return null;
  const { province, ...loc } = row;
  const p = one(province);
  return { ...loc, province_name: p?.name ?? null, province_slug: p?.slug ?? null, province_region: p?.region ?? null };
}

export async function getPublishedLocations() {
  const db = await userDb();
  return rows(await db.from('location').select(WITH_PROVINCE)
    .eq('intake_status', 'published').eq('published', true).order('name_en')).map(flatten);
}

export async function getLocationCounts() {
  const db = await userDb();
  const all = rows(await db.from('location').select('intake_status'));
  const count = (s) => all.filter(r => r.intake_status === s).length;
  return { total: all.length, published: count('published'), awaiting_contact: count('awaiting_contact'), unpublished: count('unpublished') };
}

export async function getLocationBySlug(slug) {
  const db = await userDb();
  return flatten(rows(await db.from('location').select(WITH_PROVINCE).eq('slug', slug).maybeSingle()));
}

export async function getPublishedLocationBySlug(slug) {
  const db = await userDb();
  return flatten(rows(await db.from('location').select(WITH_PROVINCE)
    .eq('slug', slug).eq('intake_status', 'published').eq('published', true).maybeSingle()));
}

export async function getLocationImages(locationId) {
  const db = await userDb();
  return rows(await db.from('location_image').select('*').eq('location_id', locationId).order('image_url'));
}

export async function getApprovedLocationImages(locationId) {
  const db = await userDb();
  return rows(await db.from('location_image').select('image_url, image_source, usage_right')
    .eq('location_id', locationId).eq('status', 'approved').order('image_url'));
}

// Every name, published or not, to keep place names out of extracted text (BR-001 of M3): System read.
export async function getAllLocationNames() {
  const db = systemDb();
  return rows(await db.from('location').select('name_vi, name_en')).flatMap(r => [r.name_vi, r.name_en]).filter(Boolean);
}

export async function getAllProvinces() {
  const db = await userDb();
  return rows(await db.from('province').select('*').order('name'));
}
