import { adminRoute } from '../../../../../../../lib/api/admin.js';
import { verifyAuthorityContact } from '../../../../../../../lib/db/admin-locations.js';

/** POST: mark the contact as verified by the acting staff member, now (FR-004). */
export const POST = adminRoute((_req, params, session) => Response.json(verifyAuthorityContact(params.id, session)));
