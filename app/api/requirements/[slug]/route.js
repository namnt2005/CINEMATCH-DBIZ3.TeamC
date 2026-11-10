import { getRequirement } from '../../../../lib/db/requirements.js';
import { checkError, fromCheckError } from '../../../../lib/api/checks.js';

/** GET /api/requirements/:slug — SC-31: one rule with both languages and its citation (FR-016); retired rules marked (SR-293). */
export async function GET(_req, { params }) {
  if (!/^[a-z0-9-]{1,120}$/.test(params?.slug || '')) return checkError('NOT_FOUND');
  try {
    return Response.json(await getRequirement(params.slug));
  } catch (err) {
    return fromCheckError(err);
  }
}
