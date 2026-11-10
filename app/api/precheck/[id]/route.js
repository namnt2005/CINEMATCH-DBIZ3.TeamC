import { getPrecheck } from '../../../../lib/db/precheck.js';
import { isUuid } from '../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../lib/api/checks.js';

export const dynamic = 'force-dynamic';

/** GET /api/precheck/:id — SC-48 reopened: the run with its cited rules and spans; the text is not kept (D3). */
export async function GET(req, { params }) {
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await getPrecheck(params.id));
  } catch (err) {
    return fromCheckError(err);
  }
}
