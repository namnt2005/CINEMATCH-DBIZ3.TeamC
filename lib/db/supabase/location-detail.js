import { getPublishedLocationBySlug, getApprovedLocationImages } from './locations.js';
import { getNearbyLocations } from './nearby.js';
import { systemDb, rows } from './util.js';
import { toBool } from '../row-values.js';
import { buildDetailPayload } from '../detail-payload.js';

// Only the verification flag, read by the System so guests also learn whether a contact exists (no details, SR-111)
async function hasVerifiedContact(locationId) {
  const row = rows(await systemDb().from('authority_contact').select('contact_verified').eq('location_id', locationId).maybeSingle());
  return toBool(row?.contact_verified) === true;
}

export async function getLocationDetail(slug) {
  const loc = await getPublishedLocationBySlug(slug);
  if (!loc) return null;
  const [images, nearby, verified] = await Promise.all([
    getApprovedLocationImages(loc.location_id),
    getNearbyLocations(loc.location_id),
    hasVerifiedContact(loc.location_id)
  ]);
  return buildDetailPayload(loc, { images, nearby, hasVerifiedContact: verified });
}
