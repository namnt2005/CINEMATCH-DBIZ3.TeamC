import { randomUUID } from 'node:crypto';
import { query, getOne, getDb, withTransaction } from './client.js';
import { writeAudit, nowInVietnam } from './audit.js';
import { removeDiacritics } from './search.js';
import { toBool, toNumber, toArray, toText } from './row-values.js';
import { validateLocationInput, validateContactInput, LOCATION_FIELDS } from '../admin/location-input.js';
import { AdminError, ValidationError, BLOCKED_REASON, notFound } from '../admin/errors.js';

/*
 * Data access for SC-35 (M3 US-3): FR-001, FR-002, FR-004, FR-005, BR-004, BR-008, BR-010.
 * Every change runs in withTransaction() with its audit row (SC-35 SR-317, M10 BR-005);
 * publishing is decided by the database trigger trg_location_publish_needs_contact (lib/db/local-triggers.sql).
 */

export const STATUSES = ['awaiting_contact', 'published', 'unpublished'];
const ARRAY_FIELDS = ['scene_types', 'months_to_avoid', 'rainy_months'];
const BOOL_FIELDS = ['lodging_20km', 'grid_power', 'truck_access'];

// ---- conversions between the stored row (seed text) and the API values ---------------------

function fieldFromRow(field, raw) {
  if (ARRAY_FIELDS.includes(field)) return field === 'scene_types' ? toArray(raw) || [] : toArray(raw);
  if (BOOL_FIELDS.includes(field)) return toBool(raw);
  if (['province_id', 'lat', 'lng', 'airport_km'].includes(field)) return toNumber(raw);
  return toText(raw);
}

function fieldToDb(field, value) {
  if (value === null || value === undefined) return null;
  if (ARRAY_FIELDS.includes(field)) return JSON.stringify(value);
  if (BOOL_FIELDS.includes(field)) return value ? 'true' : 'false'; // stored as text like the seed
  return value;
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function slugFrom(nameEn) {
  return removeDiacritics(nameEn).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160).replace(/-+$/, '');
}

function contactOf(locationId) {
  return getOne(`
    SELECT c.*, pr.full_name AS verified_by_name
    FROM authority_contact c
    LEFT JOIN profile pr ON pr.user_id = c.verified_by
    WHERE c.location_id = ?
  `, [locationId]);
}

function locationOf(id) {
  const row = getOne('SELECT * FROM location WHERE location_id = ?', [id]);
  if (!row) throw notFound();
  return row;
}

// SC-35 #23: why Publish is disabled. A location that is not published and whose contact is not
// verified always shows the BR-004 reason; otherwise the stored reason (e.g. why it was unpublished).
function blockedReason(row, contactVerified) {
  if (row.intake_status !== 'published' && !contactVerified) return BLOCKED_REASON;
  return toText(row.blocked_reason);
}

// ---- reads (FR-001, SC-35 #3–#23) -----------------------------------------------------------

export function countLocationsByStatus() {
  const counts = { all: 0, awaiting_contact: 0, published: 0, unpublished: 0 };
  for (const r of query('SELECT intake_status, count(*) AS n FROM location GROUP BY intake_status')) {
    counts[r.intake_status] = Number(r.n);
    counts.all += Number(r.n);
  }
  return counts;
}

/**
 * Every location, in every status (FR-001), optionally filtered.
 * @param {{ status?: string, q?: string, provinceId?: number }} [filter]
 */
export function listAdminLocations({ status, q, provinceId } = {}) {
  const rows = query(`
    SELECT l.location_id, l.slug, l.name_vi, l.name_en, l.province_id, p.name AS province,
           l.intake_status, l.availability, l.blocked_reason, c.contact_verified, c.verified_at,
           (SELECT count(*) FROM location_image i WHERE i.location_id = l.location_id) AS photo_count,
           (SELECT count(*) FROM location_image i WHERE i.location_id = l.location_id AND i.status = 'pending') AS pending_photo_count
    FROM location l
    JOIN province p ON p.province_id = l.province_id
    LEFT JOIN authority_contact c ON c.location_id = l.location_id
    ORDER BY l.name_en
  `);
  const needle = q ? removeDiacritics(q) : '';

  return rows
    .filter(r => !status || r.intake_status === status)
    .filter(r => !provinceId || Number(r.province_id) === provinceId)
    .filter(r => !needle || removeDiacritics(`${r.name_vi} ${r.name_en}`).includes(needle))
    .map(r => {
      const verified = toBool(r.contact_verified) === true;
      return {
        location_id: r.location_id,
        slug: r.slug,
        name_vi: r.name_vi,
        name_en: r.name_en,
        province: r.province,
        intake_status: r.intake_status,
        availability: r.availability,
        contact_verified: verified,
        verified_at: toText(r.verified_at),
        photo_count: Number(r.photo_count),
        pending_photo_count: Number(r.pending_photo_count),
        blocked_reason: blockedReason(r, verified)
      };
    });
}

/** One location for the SC-35 editor: the 20 fields, the contact, photos (read-only) and the publish state. */
export function getAdminLocation(id) {
  const row = locationOf(id);
  const province = getOne('SELECT name FROM province WHERE province_id = ?', [row.province_id]);
  const contact = contactOf(id);
  const verified = toBool(contact?.contact_verified) === true;

  const fields = {};
  for (const field of LOCATION_FIELDS) fields[field] = fieldFromRow(field, row[field]);

  return {
    location_id: row.location_id,
    slug: row.slug,
    ...fields,
    province: province?.name ?? null,
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
          verified_by_name: contact.verified_by_name ?? null,
          verified_at: toText(contact.verified_at)
        }
      : null,
    photos: query('SELECT image_url, image_source, usage_right, status FROM location_image WHERE location_id = ? ORDER BY image_url', [id])
  };
}

// ---- create and edit (FR-002, BR-010) -------------------------------------------------------

/** Creates a location; it always starts as awaiting_contact (SC-35 #4). Audit: location.create. */
export function createLocation(input, session) {
  const { ok, errors, value } = validateLocationInput(input);
  if (!ok) throw new ValidationError(errors);

  // Interim rule, research Open question 4: slug from the English name, a duplicate is refused.
  const slug = slugFrom(value.name_en);
  if (!slug || getOne('SELECT 1 AS taken FROM location WHERE slug = ?', [slug])) {
    throw new AdminError('SLUG_TAKEN', 409, `A location with the address "${slug}" already exists; change the English name.`, { slug });
  }

  const id = randomUUID();
  const columns = ['location_id', 'slug', ...LOCATION_FIELDS, 'intake_status', 'published', 'blocked_reason'];
  const values = [id, slug, ...LOCATION_FIELDS.map(f => fieldToDb(f, value[f])), 'awaiting_contact', 'false', BLOCKED_REASON];

  withTransaction(db => {
    db.prepare(`INSERT INTO location (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`).run(...values);
    writeAudit(db, { action: 'location.create', adminId: session.userId, targetId: id });
  });
  return { location_id: id, slug, intake_status: 'awaiting_contact', published: false };
}

/**
 * Updates any of the 20 fields; status and slug never change here.
 * Audit: location.availability when availability changes (BR-010), location.update for any other change.
 */
export function updateLocation(id, input, session) {
  const row = locationOf(id);
  const { ok, errors, value } = validateLocationInput(input, { partial: true });
  if (!ok) throw new ValidationError(errors);

  const changed = Object.keys(value).filter(f => !same(fieldFromRow(f, row[f]), value[f]));
  if (changed.length > 0) {
    withTransaction(db => {
      db.prepare(`UPDATE location SET ${changed.map(f => `${f} = ?`).join(', ')} WHERE location_id = ?`)
        .run(...changed.map(f => fieldToDb(f, value[f])), id);
      if (changed.includes('availability')) writeAudit(db, { action: 'location.availability', adminId: session.userId, targetId: id });
      if (changed.some(f => f !== 'availability')) writeAudit(db, { action: 'location.update', adminId: session.userId, targetId: id });
    });
  }
  return getAdminLocation(id);
}

// ---- authority contact (FR-004, SR-314, decision D4) -----------------------------------------

function contactStatus(id) {
  const c = contactOf(id);
  return {
    location_id: id,
    contact_verified: toBool(c.contact_verified) === true,
    verified_by_name: c.verified_by_name ?? null,
    verified_at: toText(c.verified_at)
  };
}

/**
 * Saves the contact. Any change makes it not verified (SR-314); a published location stays published (D4).
 * verified_by = the acting staff member, as the seed does for unverified contacts (interim, research Open question 9).
 * Audit: location.update.
 */
export function saveAuthorityContact(id, input, session) {
  locationOf(id);
  const { ok, errors, value } = validateContactInput(input);
  if (!ok) throw new ValidationError(errors);

  const existing = contactOf(id);
  const unchanged = existing && ['authority_name', 'contact_name', 'contact_phone', 'contact_email']
    .every(f => same(toText(existing[f]), value[f]));

  if (!unchanged) {
    withTransaction(db => {
      db.prepare(`
        INSERT INTO authority_contact (location_id, authority_name, contact_name, contact_phone, contact_email,
                                       verified_by, verified_at, contact_verified)
        VALUES (?, ?, ?, ?, ?, ?, NULL, 'false')
        ON CONFLICT (location_id) DO UPDATE SET
          authority_name = excluded.authority_name, contact_name = excluded.contact_name,
          contact_phone = excluded.contact_phone, contact_email = excluded.contact_email,
          verified_by = excluded.verified_by, verified_at = NULL, contact_verified = 'false'
      `).run(id, value.authority_name, value.contact_name, value.contact_phone, value.contact_email, session.userId);
      writeAudit(db, { action: 'location.update', adminId: session.userId, targetId: id });
    });
  }
  return contactStatus(id);
}

/** Marks the contact as verified by the acting staff member, now (FR-004). Audit: location.contact_verify. */
export function verifyAuthorityContact(id, session) {
  const row = locationOf(id);
  if (!contactOf(id)) throw new AdminError('NO_CONTACT', 409, 'Record the local authority contact before verifying it.');

  withTransaction(db => {
    db.prepare("UPDATE authority_contact SET contact_verified = 'true', verified_by = ?, verified_at = ? WHERE location_id = ?")
      .run(session.userId, nowInVietnam(), id);
    if (row.blocked_reason === BLOCKED_REASON) {
      db.prepare('UPDATE location SET blocked_reason = NULL WHERE location_id = ?').run(id);
    }
    writeAudit(db, { action: 'location.contact_verify', adminId: session.userId, targetId: id });
  });
  return contactStatus(id);
}

// ---- publish and unpublish (FR-005, BR-004, BR-008) ------------------------------------------

/** Publishes, or publishes again; the database refuses when the contact is not verified (BR-004). Audit: location.publish. */
export function publishLocation(id, session) {
  const row = locationOf(id);
  if (row.intake_status === 'published') {
    throw new AdminError('INVALID_TRANSITION', 409, 'This location is already published.');
  }

  try {
    withTransaction(db => {
      db.prepare("UPDATE location SET intake_status = 'published', published = 'true', blocked_reason = NULL WHERE location_id = ?").run(id);
      writeAudit(db, { action: 'location.publish', adminId: session.userId, targetId: id });
    });
  } catch (err) {
    if (!/BR-004/.test(err.message)) throw err;
    // The refusal changes nothing but the reason shown next to Publish (SC-35 #23); no audit row.
    getDb().prepare('UPDATE location SET blocked_reason = ? WHERE location_id = ?').run(BLOCKED_REASON, id);
    throw new AdminError('UNVERIFIED_CONTACT', 409, 'Cannot publish: the local authority contact is not verified (M3 BR-004).', {
      blocked_reason: BLOCKED_REASON
    });
  }
  return { location_id: id, intake_status: 'published', published: true, blocked_reason: null };
}

/**
 * Unpublishes; the row is kept, never deleted (BR-008). The optional reason is stored in blocked_reason
 * (interim, research Open question 3). Audit: location.unpublish.
 */
export function unpublishLocation(id, reason, session) {
  const row = locationOf(id);
  if (row.intake_status !== 'published') {
    throw new AdminError('INVALID_TRANSITION', 409, 'Only a published location can be unpublished.');
  }
  const note = typeof reason === 'string' && reason.trim() !== '' ? reason.trim() : null;

  withTransaction(db => {
    db.prepare("UPDATE location SET intake_status = 'unpublished', published = 'false', blocked_reason = ? WHERE location_id = ?").run(note, id);
    writeAudit(db, { action: 'location.unpublish', adminId: session.userId, targetId: id });
  });
  return { location_id: id, intake_status: 'unpublished', published: false, blocked_reason: note };
}

