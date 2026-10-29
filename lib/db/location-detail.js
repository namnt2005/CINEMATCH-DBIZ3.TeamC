import { getPublishedLocationBySlug, getApprovedLocationImages } from './locations.js';
import { getNearbyLocations } from './nearby.js';
import { getOne } from './client.js';
import { toBool, toNumber, toArray, toText } from './row-values.js';

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

  return {
    location_id: loc.location_id,
    slug: loc.slug,
    name_vi: loc.name_vi,
    name_en: loc.name_en,
    province: {
      province_id: toNumber(loc.province_id),
      name: loc.province_name,
      region: loc.province_region
    },
    district: toText(loc.district),
    coordinates: {
      lat: toNumber(loc.lat),
      lng: toNumber(loc.lng)
    },
    airport_km: toNumber(loc.airport_km),
    scene_types: toArray(loc.scene_types) || [],
    desc_vi: loc.desc_vi,
    desc_en: loc.desc_en,
    logistics: {
      crew_capacity: toText(loc.crew_capacity),
      lodging_20km: toBool(loc.lodging_20km),
      grid_power: toBool(loc.grid_power),
      truck_access: toBool(loc.truck_access)
    },
    season: {
      months_to_avoid: toArray(loc.months_to_avoid),
      rainy_months: toArray(loc.rainy_months),
      night_shooting_allowed: toText(loc.night_shooting_allowed)
    },
    permit_complexity: toText(loc.permit_complexity),
    restriction_note: toText(loc.restriction_note),
    availability: loc.availability,
    images: getApprovedLocationImages(loc.location_id).map(img => ({
      image_url: img.image_url,
      image_source: img.image_source,
      usage_right: img.usage_right
    })),
    // Published locations within 30 km, closest first, max 5 (F-M3-14)
    nearby_locations: getNearbyLocations(loc.location_id),
    // A published location can have an unverified contact after staff edit it (decision D4),
    // so the flag is read; no contact detail leaves this query (research R8).
    has_verified_contact: hasVerifiedContact(loc.location_id)
  };
}
