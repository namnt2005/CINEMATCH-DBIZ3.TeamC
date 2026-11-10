import { adminRoute, readBody } from '../../../../../../lib/api/admin.js';
import { unpublishLocation } from '../../../../../../lib/db/admin-locations.js';

export const dynamic = 'force-dynamic';

/** POST: unpublish with an optional reason; the location is kept (BR-008). */
export const POST = adminRoute(async (req, params, session) => {
  const { reason } = await readBody(req);
  return Response.json(await unpublishLocation(params.id, reason, session));
});
