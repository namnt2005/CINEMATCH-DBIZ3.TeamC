import { adminRoute } from '../../../../../../lib/api/admin.js';
import { publishLocation } from '../../../../../../lib/db/admin-locations.js';

/** POST: publish, or publish again; refused by the database while the contact is not verified (FR-005, BR-004). */
export const POST = adminRoute((_req, params, session) => Response.json(publishLocation(params.id, session)));
