import { validateOverride } from '../../../../../lib/router/answers.js';
import { splitRequirements, needsLegalCaveat } from '../../../../../lib/router/decide.js';
import { readSession, sessionKey, requestLocale } from '../../../../../lib/router/session.js';
import { getRouterData, overrideDecision } from '../../../../../lib/db/router.js';
import { apiMessage } from '../../../../../lib/i18n/index.js';

export const dynamic = 'force-dynamic';

const fail = (code, status, extra = {}) => Response.json({ error: code, message: apiMessage(`router.api.${code}`), ...extra }, { status });

/**
 * PATCH /api/router/decisions/:id — SC-02 "Choose another segment" (US-2, BR-003): always allowed, always
 * recorded on the row of the same session; picking the table's own segment clears the override.
 */
export async function PATCH(req, { params }) {
  let body;
  try { body = await req.json(); } catch { return fail('INVALID_JSON', 400); }
  const { ok, errors, value } = validateOverride(body);
  if (!ok) return fail('VALIDATION_ERROR', 422, { fields: errors });

  const session = readSession(req);
  // Another session's row (or no session) is answered as not found: other visitors' rows are never revealed
  const changed = session ? await overrideDecision({ sessionKey: sessionKey(session), id: params.id, segment: value.segment_override }) : null;
  if (!changed) return fail('NOT_FOUND', 404);

  const { requirements } = await getRouterData();
  return Response.json({
    segment_decision_id: changed.segment_decision_id,
    segment: changed.segment,
    segment_override: changed.segment_override,
    requirements: splitRequirements(changed.segment, requirements, await requestLocale(req)),
    caveat: needsLegalCaveat(changed.segment)
  });
}
