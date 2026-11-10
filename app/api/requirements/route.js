import { listRequirements } from '../../../lib/db/requirements.js';
import { fromCheckError } from '../../../lib/api/checks.js';

/** GET /api/requirements?topic=&segment= — SC-30: approved rules in force, no account needed (FR-015, SR-285). */
export async function GET(req) {
  const params = new URL(req.url).searchParams;
  try {
    return Response.json(await listRequirements({ topic: params.get('topic'), segment: params.get('segment') }));
  } catch (err) {
    return fromCheckError(err);
  }
}
