import { adminRoute } from '../../../../../../../lib/api/admin.js';
import { verifyAuthorityContact } from '../../../../../../../lib/db/admin-locations.js';

/** POST: mark the contact as verified by the acting staff member, now (FR-004). */
export const POST = adminRoute(async (_req, params, session) => Response.json(await verifyAuthorityContact(params.id, session)));
