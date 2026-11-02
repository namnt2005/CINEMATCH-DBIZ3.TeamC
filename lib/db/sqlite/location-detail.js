import { getPublishedLocationBySlug, getApprovedLocationImages } from './locations.js';
import { getNearbyLocations } from './nearby.js';
import { getOne } from '../client.js';
import { toBool } from '../row-values.js';
import { buildDetailPayload } from '../detail-payload.js';

function hasVerifiedContact(locationId) {
  const row = getOne('SELECT contact_verified FROM authority_contact WHERE location_id = ?', [locationId]);
  return toBool(row?.contact_verified) === true;
}

/**
 * Public location detail payload for SC-16 (F-M3-13, contracts/location-detail-and-contact.contract.md §1).
 * Returns null when the slug is unknown or the location is not published.
 * Reads only the verification flag of authority_contact, never its details (BR-005, SR-111).
 */
export function getLocationDetail(slug) {
  const loc = getPublishedLocationBySlug(slug);
  if (!loc) return null;

  return buildDetailPayload(loc, {
    images: getApprovedLocationImages(loc.location_id),
    nearby: getNearbyLocations(loc.location_id),
    hasVerifiedContact: hasVerifiedContact(loc.location_id)
  });
}
