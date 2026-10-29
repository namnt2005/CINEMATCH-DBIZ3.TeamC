import { adminRoute, readBody } from '../../../../../../lib/api/admin.js';
import { unpublishLocation } from '../../../../../../lib/db/admin-locations.js';

/** POST: unpublish with an optional reason; the location is kept (BR-008). */
export const POST = adminRoute(async (req, params, session) => {
  const { reason } = await readBody(req);
  return Response.json(unpublishLocation(params.id, reason, session));
});
