import { getMyOrganisation, saveOrgProfile } from '../../../../lib/db/partners.js';
import { validateOrgProfile } from '../../../../lib/partners/input.js';
import { memberSession, readBody } from '../../../../lib/api/projects.js';
import { partnerError, fromPartnerError } from '../../../../lib/api/partners.js';

/** GET /api/partners/me — SC-21: the organisation the partner acts for, its three layers and its verification state. */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  try {
    return Response.json(await getMyOrganisation(session));
  } catch (err) {
    return fromPartnerError(err);
  }
}

/** PATCH /api/partners/me — FR-001: layers 1–3, live at once (D3); VFDA's fields are refused (SR-326). */
export async function PATCH(req) {
  const session = await memberSession(req);
  if (!session) return partnerError('UNAUTHENTICATED');
  const { ok, errors, value } = validateOrgProfile(await readBody(req));
  if (!ok) return partnerError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await saveOrgProfile(session, value));
  } catch (err) {
    return fromPartnerError(err);
  }
}
