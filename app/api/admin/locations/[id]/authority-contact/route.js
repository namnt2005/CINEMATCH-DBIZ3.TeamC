import { adminRoute, readBody } from '../../../../../../lib/api/admin.js';
import { saveAuthorityContact } from '../../../../../../lib/db/admin-locations.js';

/** PUT: record the local authority contact; any change makes it not verified (FR-004, SR-314). */
export const PUT = adminRoute(async (req, params, session) =>
  Response.json(saveAuthorityContact(params.id, await readBody(req), session)));
