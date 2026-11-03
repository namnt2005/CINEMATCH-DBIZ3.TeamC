import { validateAnswers } from '../../../../lib/router/answers.js';
import { decide, splitRequirements, needsLegalCaveat, journeyConfig } from '../../../../lib/router/decide.js';
import { readSession, newSession, sessionKey, sessionCookie, requestLocale } from '../../../../lib/router/session.js';
import { getRouterData, saveDecision } from '../../../../lib/db/router.js';
import { apiMessage } from '../../../../lib/i18n/index.js';

const fail = (code, status, extra = {}) => Response.json({ error: code, message: apiMessage(`router.api.${code}`), ...extra }, { status });

/**
 * POST /api/router/decisions — SC-02: store the result of a complete answer set (FR-002, D3).
 * No sign-in. The server recomputes the segment from the current decision table; a segment in the body is
 * never used (BR-001); question 4 is stored but never picks the segment (BR-002).
 */
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return fail('INVALID_JSON', 400); }
  const { ok, errors, value: answers } = validateAnswers(body);
  if (!ok) return fail('VALIDATION_ERROR', 422, { fields: errors });

  const { rules, requirements } = await getRouterData();
  const decision = decide(answers, rules);
  const existing = readSession(req);
  const session = existing || newSession();
  const { segment_decision_id } = await saveDecision({
    sessionKey: sessionKey(session), answers, decision,
    journeyConfig: journeyConfig(decision.segment, requirements, answers.q4_needs)
  });

  const res = Response.json({
    segment_decision_id,
    segment: decision.segment,
    decided_by: decision.decided_by,
    matched: decision.matched,
    requirements: splitRequirements(decision.segment, requirements, await requestLocale(req)),
    caveat: needsLegalCaveat(decision.segment)
  }, { status: 201 });
  if (!existing) res.headers.append('set-cookie', sessionCookie(session));
  return res;
}
