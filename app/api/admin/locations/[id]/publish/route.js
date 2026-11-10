import { adminRoute } from '../../../../../../lib/api/admin.js';
import { publishLocation } from '../../../../../../lib/db/admin-locations.js';

export const dynamic = 'force-dynamic';

/** POST: publish, or publish again; refused by the database while the contact is not verified (FR-005, BR-004). */
export const POST = adminRoute(async (_req, params, session) => Response.json(await publishLocation(params.id, session)));
