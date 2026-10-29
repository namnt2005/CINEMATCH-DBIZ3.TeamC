import { query, getOne } from './client.js';

/**
 * Returns all published locations (BR-008: intake_status = 'published', published = true)
 */
export function getPublishedLocations() {
  const sql = `
    SELECT l.*, p.name as province_name, p.slug as province_slug, p.region as province_region
    FROM location l
    JOIN province p ON l.province_id = p.province_id
    WHERE (l.published = 'true' OR l.published = 1)
      AND l.intake_status = 'published'
    ORDER BY l.name_en ASC
  `;
  return query(sql);
}

/**
 * Returns summary count of locations by intake status
 */
export function getLocationCounts() {
  const totalRow = getOne('SELECT count(*) as count FROM location');
  const publishedRow = getOne("SELECT count(*) as count FROM location WHERE (published = 'true' OR published = 1) AND intake_status = 'published'");
  const awaitingRow = getOne("SELECT count(*) as count FROM location WHERE (published = 'false' OR published = 0) AND intake_status = 'awaiting_contact'");
  const unpublishedRow = getOne("SELECT count(*) as count FROM location WHERE (published = 'false' OR published = 0) AND intake_status = 'unpublished'");

  return {
    total: totalRow ? totalRow.count : 0,
    published: publishedRow ? publishedRow.count : 0,
    awaiting_contact: awaitingRow ? awaitingRow.count : 0,
    unpublished: unpublishedRow ? unpublishedRow.count : 0
  };
}

/**
 * Returns single location by slug
 */
export function getLocationBySlug(slug) {
  const sql = `
    SELECT l.*, p.name as province_name, p.slug as province_slug, p.region as province_region
    FROM location l
    JOIN province p ON l.province_id = p.province_id
    WHERE l.slug = ?
  `;
  return getOne(sql, [slug]);
}

/**
 * Returns single published location by slug (BR-008: intake_status = 'published', published = true)
 */
export function getPublishedLocationBySlug(slug) {
  const sql = `
    SELECT l.*, p.name as province_name, p.slug as province_slug, p.region as province_region
    FROM location l
    JOIN province p ON l.province_id = p.province_id
    WHERE l.slug = ?
      AND (l.published = 'true' OR l.published = 1)
      AND l.intake_status = 'published'
  `;
  return getOne(sql, [slug]);
}

/**
 * Returns images for a given location (location_image has no image_id; image_url is the key)
 */
export function getLocationImages(locationId) {
  const sql = `
    SELECT *
    FROM location_image
    WHERE location_id = ?
    ORDER BY image_url ASC
  `;
  return query(sql, [locationId]);
}

/**
 * Returns approved images only, the ones a guest or member may see (SC-16 #3)
 */
export function getApprovedLocationImages(locationId) {
  const sql = `
    SELECT image_url, image_source, usage_right
    FROM location_image
    WHERE location_id = ? AND status = 'approved'
    ORDER BY image_url ASC
  `;
  return query(sql, [locationId]);
}

/**
 * Returns all provinces
 */
export function getAllProvinces() {
  return query('SELECT * FROM province ORDER BY name ASC');
}
