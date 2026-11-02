import { userDb, rows } from './util.js';
import { canSeeAuthorityContact } from '../contact-access.js';
import { toText } from '../row-values.js';

/**
 * The verified contact of a location, or null (F-M3-15). A guest never triggers a query (SR-111);
 * for signed-in users Row Level Security returns verified contacts of published locations only (BR-001).
 */
export async function getAuthorityContact(locationId, session) {
  if (!canSeeAuthorityContact(session)) return null;
  const db = await userDb();
  const row = rows(await db.from('authority_contact')
    .select('location_id, authority_name, contact_name, contact_phone, contact_email, verified_by, verified_at, contact_verified')
    .eq('location_id', locationId).eq('contact_verified', true).maybeSingle());
  if (!row) return null;
  return { ...row, contact_email: toText(row.contact_email), contact_verified: true };
}
