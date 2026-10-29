import { getPublishedLocationBySlug, getApprovedLocationImages } from './locations.js';

/**
 * Seed rows come from CSV, so booleans, numbers and arrays arrive as text.
 * Empty values stay null: "no data yet" is not the same as false or [] (BR-003).
 */
function toBool(v) {
  if (v === true || v === 1 || v === 'true' || v === '1') return true;
  if (v === false || v === 0 || v === 'false' || v === '0') return false;
  return null;
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string' || v.trim() === '') return null;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toText(v) {
  return v === null || v === undefined || v === '' ? null : v;
}

/**
 * Public location detail payload for SC-16 (F-M3-13, contracts/location-detail-and-contact.contract.md §1).
 * Returns null when the slug is unknown or the location is not published.
 * Never reads authority_contact (BR-005, SR-111).
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
    // A location is published only once its contact is verified (BR-004: seed_rules + publish trigger),
    // so this is known without querying authority_contact.
    has_verified_contact: true
  };
}
