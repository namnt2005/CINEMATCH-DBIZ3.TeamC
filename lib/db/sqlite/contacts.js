import { query, getOne } from '../client.js';
import { canSeeAuthorityContact } from '../contact-access.js';

export { CONTACT_ROLES, canSeeAuthorityContact } from '../contact-access.js';


/**
 * Returns the verified local authority contact of a location, or null (F-M3-15).
 * Local stand-in for Row Level Security: the role is checked before any query,
 * so authority_contact is never read for a guest (BR-005, SR-111).
 * Only verified contacts are returned (BR-004).
 *
 * @param {string} locationId
 * @param {{ role: string, isAuthenticated: boolean }} session
 * @param {{ query: Function, getOne: Function }} [db] data access, replaceable in tests
 */
export function getAuthorityContact(locationId, session, db = { query, getOne }) {
  if (!canSeeAuthorityContact(session)) return null;

  const row = db.getOne(
    `
    SELECT location_id, authority_name, contact_name, contact_phone, contact_email,
           verified_by, verified_at, contact_verified
    FROM authority_contact
    WHERE location_id = ?
      AND (contact_verified = 'true' OR contact_verified = 1)
    `,
    [locationId]
  );
  if (!row) return null;

  return {
    location_id: row.location_id,
    authority_name: row.authority_name,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    contact_email: row.contact_email || null,
    verified_by: row.verified_by,
    verified_at: row.verified_at,
    contact_verified: true
  };
}
