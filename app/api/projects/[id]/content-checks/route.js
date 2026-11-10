import { saveContentCheck } from '../../../../../lib/db/content-checks.js';
import { memberSession, isUuid, readBody } from '../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../lib/api/checks.js';

/** POST /api/projects/:id/content-checks — SC-48 *Save to project* (FR-013, FR-014, D5, research R7): owner or edit. */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  const body = await readBody(req);
  try {
    return Response.json(await saveContentCheck(session, params.id, {
      text: body.text, lang: body.lang, rule_version: body.rule_version, findings: body.findings
    }), { status: 201 });
  } catch (err) {
    return fromCheckError(err);
  }
}
