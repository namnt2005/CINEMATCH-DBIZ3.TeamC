import { adminRoute, readBody } from '../../../../lib/api/admin.js';
import { ValidationError } from '../../../../lib/admin/errors.js';
import { listAdminLocations, countLocationsByStatus, createLocation, STATUSES } from '../../../../lib/db/admin-locations.js';

/**
 * GET: every location in every status, with counts for the whole catalogue (FR-001, SC-35 #3–#11).
 * Query: status, q (name, with or without diacritics, ≤ 200), province_id.
 */
export const GET = adminRoute((req) => {
  const params = new URL(req.url).searchParams;
  const status = params.get('status') || undefined;
  const q = params.get('q') || undefined;
  const provinceRaw = params.get('province_id');
  const provinceId = provinceRaw ? Number(provinceRaw) : undefined;

  const errors = {};
  if (status && !STATUSES.includes(status)) errors.status = `Status must be one of: ${STATUSES.join(', ')}.`;
  if (q && q.length > 200) errors.q = 'Search must be at most 200 characters.';
  if (provinceRaw && !Number.isInteger(provinceId)) errors.province_id = 'Province must be a number.';
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  return Response.json({
    counts: countLocationsByStatus(),
    locations: listAdminLocations({ status, q, provinceId })
  });
});

/** POST: create a location with the 20 fields; it starts as awaiting_contact (FR-002). */
export const POST = adminRoute(async (req, _params, session) => {
  const created = createLocation(await readBody(req), session);
  return Response.json(created, { status: 201 });
});
