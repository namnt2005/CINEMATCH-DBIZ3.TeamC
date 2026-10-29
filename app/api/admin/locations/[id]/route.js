import { adminRoute, readBody, methodNotAllowed } from '../../../../../lib/api/admin.js';
import { getAdminLocation, updateLocation } from '../../../../../lib/db/admin-locations.js';

/** GET: one location for the SC-35 editor (20 fields, contact, read-only photos, publish state). */
export const GET = adminRoute((_req, params) => Response.json(getAdminLocation(params.id)));

/** PUT: update any of the 20 fields (FR-002); availability changes are audited on their own (BR-010). */
export const PUT = adminRoute(async (req, params, session) =>
  Response.json(updateLocation(params.id, await readBody(req), session)));

/** DELETE: refused — locations are unpublished, never deleted (BR-008, SR-312). */
export const DELETE = adminRoute(() => methodNotAllowed());
