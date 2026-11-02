import { userDb, systemDb, one } from './util.js';
import { getAllProvinces } from './locations.js';
import { removeDiacritics } from '../search-core.js';
import { toBool, toText } from '../row-values.js';
import { fieldFromRow, same, slugFrom, blockedReason } from '../admin-shape.js';
import { validateLocationInput, validateContactInput, LOCATION_FIELDS } from '../../admin/location-input.js';
import { AdminError, ValidationError, BLOCKED_REASON, notFound } from '../../admin/errors.js';

export { STATUSES } from '../admin-shape.js';

/*
 * SC-35 on Supabase (M3 US-3). Reads run as the signed-in staff member (RLS); every write is one
 * Postgres function (supabase/migrations/20261101000400_rules.sql) that changes the data and writes
 * its audit row in the same transaction (M10 BR-005, specs/003-sys-core research R4).
 */

/** Database errors → the same codes as the sqlite source (contracts/data-layer.contract.md). */
function adminError(error) {
  const message = error?.message || '';
  if (error?.code === '42501' || /forbidden/i.test(message)) return new AdminError('FORBIDDEN', 403, 'Only VFDA staff can manage locations.');
  if (/BR-004/.test(message)) {
    return new AdminError('UNVERIFIED_CONTACT', 409, 'Cannot publish: the local authority contact is not verified (M3 BR-004).', { blocked_reason: BLOCKED_REASON });
  }
  if (/NO_CONTACT/.test(message)) return new AdminError('NO_CONTACT', 409, 'Record the local authority contact before verifying it.');
  if (/INVALID_TRANSITION/.test(message)) return new AdminError('INVALID_TRANSITION', 409, message.replace(/^.*INVALID_TRANSITION:?\s*/, '') || 'Not allowed in this status.');
  if (/NOT_FOUND/.test(message)) return notFound();
  if (error?.code === '23505' || /SLUG_TAKEN/.test(message)) return new AdminError('SLUG_TAKEN', 409, 'A location with this address already exists; change the English name.');
  return Object.assign(new Error(message || 'Database error'), { cause: error });
}

/** Unwraps a read; a refused read (42501) is FORBIDDEN 403 like a refused write, not a 500. */
function read({ data, error }) {
  if (error) throw adminError(error);
  return data;
}

async function rpc(name, args) {
  const db = await userDb();
  const { data, error } = await db.rpc(name, args);
  if (error) throw adminError(error);
  if (data && typeof data === 'object' && data.error) throw adminError({ message: data.error });
  return data;
}

async function locationOf(id) {
  const db = await userDb();
  const row = read(await db.from('location').select('*').eq('location_id', id).maybeSingle());
  if (!row) throw notFound();
  return row;
}

async function profileName(userId) {
  if (!userId) return null;
  const row = read(await systemDb().from('profile').select('full_name').eq('user_id', userId).maybeSingle());
  return row?.full_name ?? null;
}

async function provinceIds() {
  return (await getAllProvinces()).map(p => Number(p.province_id));
}

// ---- reads (FR-001, SC-35 #3–#23) -----------------------------------------------------------

export async function countLocationsByStatus() {
  const db = await userDb();
  const all = read(await db.from('location').select('intake_status'));
  const counts = { all: all.length, awaiting_contact: 0, published: 0, unpublished: 0 };
  for (const r of all) counts[r.intake_status] += 1;
  return counts;
}

export async function listAdminLocations({ status, q, provinceId } = {}) {
  const db = await userDb();
  const data = read(await db.from('location')
    .select('location_id, slug, name_vi, name_en, province_id, intake_status, availability, blocked_reason, province:province_id(name), authority_contact(contact_verified, verified_at), location_image(status)')
    .order('name_en'));
  const needle = q ? removeDiacritics(q) : '';

  return data
    .filter(r => !status || r.intake_status === status)
    .filter(r => !provinceId || Number(r.province_id) === provinceId)
    .filter(r => !needle || removeDiacritics(`${r.name_vi} ${r.name_en}`).includes(needle))
    .map(r => {
      const contact = one(r.authority_contact);
      const images = r.location_image || [];
      const verified = toBool(contact?.contact_verified) === true;
      return {
        location_id: r.location_id,
        slug: r.slug,
        name_vi: r.name_vi,
        name_en: r.name_en,
        province: one(r.province)?.name ?? null,
        intake_status: r.intake_status,
        availability: r.availability,
        contact_verified: verified,
        verified_at: toText(contact?.verified_at),
        photo_count: images.length,
        pending_photo_count: images.filter(i => i.status === 'pending').length,
        blocked_reason: blockedReason(r, verified)
      };
    });
}

export async function getAdminLocation(id) {
  const db = await userDb();
  const row = read(await db.from('location')
    .select('*, province:province_id(name), authority_contact(*), location_image(image_url, image_source, usage_right, status)')
    .eq('location_id', id).maybeSingle());
  if (!row) throw notFound();

  const contact = one(row.authority_contact);
  const verified = toBool(contact?.contact_verified) === true;
  const fields = {};
  for (const field of LOCATION_FIELDS) fields[field] = fieldFromRow(field, row[field]);

  return {
    location_id: row.location_id,
    slug: row.slug,
    ...fields,
    province: one(row.province)?.name ?? null,
    intake_status: row.intake_status,
    published: toBool(row.published) === true,
    blocked_reason: blockedReason(row, verified),
    can_publish: row.intake_status !== 'published' && verified,
    authority_contact: contact
      ? {
          authority_name: contact.authority_name,
          contact_name: contact.contact_name,
          contact_phone: contact.contact_phone,
          contact_email: toText(contact.contact_email),
          contact_verified: verified,
          verified_by_name: await profileName(contact.verified_by),
          verified_at: toText(contact.verified_at)
        }
      : null,
    photos: [...(row.location_image || [])].sort((a, b) => a.image_url.localeCompare(b.image_url))
  };
}

// ---- writes through Postgres functions (FR-002, FR-004, FR-005, BR-004, BR-008, BR-010) -------

export async function createLocation(input) {
  const { ok, errors, codes, value } = validateLocationInput(input, { provinceIds: await provinceIds() });
  if (!ok) throw new ValidationError(errors, codes);
  const slug = slugFrom(value.name_en);
  if (!slug) throw new AdminError('SLUG_TAKEN', 409, 'Change the English name: it gives no address.');

  const created = await rpc('app_admin_save_location', { p_location_id: null, p_slug: slug, p_fields: value });
  return { location_id: created.location_id, slug, intake_status: 'awaiting_contact', published: false };
}

export async function updateLocation(id, input) {
  const row = await locationOf(id);
  const { ok, errors, codes, value } = validateLocationInput(input, { partial: true, provinceIds: await provinceIds() });
  if (!ok) throw new ValidationError(errors, codes);

  const changed = Object.fromEntries(Object.entries(value).filter(([f, v]) => !same(fieldFromRow(f, row[f]), v)));
  if (Object.keys(changed).length > 0) {
    await rpc('app_admin_save_location', { p_location_id: id, p_slug: null, p_fields: changed });
  }
  return getAdminLocation(id);
}

async function contactStatus(id) {
  const db = await userDb();
  const c = read(await db.from('authority_contact').select('contact_verified, verified_by, verified_at').eq('location_id', id).maybeSingle());
  return {
    location_id: id,
    contact_verified: toBool(c?.contact_verified) === true,
    verified_by_name: await profileName(c?.verified_by),
    verified_at: toText(c?.verified_at)
  };
}

export async function saveAuthorityContact(id, input) {
  await locationOf(id);
  const { ok, errors, codes, value } = validateContactInput(input);
  if (!ok) throw new ValidationError(errors, codes);

  const db = await userDb();
  const existing = read(await db.from('authority_contact').select('*').eq('location_id', id).maybeSingle());
  const unchanged = existing && ['authority_name', 'contact_name', 'contact_phone', 'contact_email']
    .every(f => same(toText(existing[f]), value[f]));
  if (!unchanged) await rpc('app_admin_save_contact', { p_location_id: id, p_contact: value });
  return contactStatus(id);
}

export async function verifyAuthorityContact(id) {
  await locationOf(id);
  await rpc('app_admin_verify_contact', { p_location_id: id });
  return contactStatus(id);
}

export async function publishLocation(id) {
  const row = await locationOf(id);
  if (row.intake_status === 'published') throw new AdminError('INVALID_TRANSITION', 409, 'This location is already published.');
  await rpc('app_admin_publish_location', { p_location_id: id });
  return { location_id: id, intake_status: 'published', published: true, blocked_reason: null };
}

export async function unpublishLocation(id, reason) {
  const row = await locationOf(id);
  if (row.intake_status !== 'published') throw new AdminError('INVALID_TRANSITION', 409, 'Only a published location can be unpublished.');
  const note = typeof reason === 'string' && reason.trim() !== '' ? reason.trim() : null;
  await rpc('app_admin_unpublish_location', { p_location_id: id, p_reason: note });
  return { location_id: id, intake_status: 'unpublished', published: false, blocked_reason: note };
}
