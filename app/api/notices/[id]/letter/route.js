import { getApprovedLetter } from '../../../../../lib/db/notices.js';
import { letterDocx, DOCX_TYPE } from '../../../../../lib/notices/docx.js';
import { validateRecipient } from '../../../../../lib/notices/input.js';
import { removeDiacritics } from '../../../../../lib/db/search-core.js';
import { projectError, fromProjectError, memberSession, isUuid } from '../../../../../lib/api/projects.js';

export const dynamic = 'force-dynamic';

const slug = (name) => removeDiacritics(String(name)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'province';

/** GET /api/notices/:id/letter?format=docx&recipient= — M7 BR-002, D7: the approved letter as Word; read-only. */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  if (!isUuid(params.id)) return projectError('NOT_FOUND');
  const recipient = new URL(req.url).searchParams.get('recipient');
  const check = validateRecipient(recipient);
  if (!check.ok) return projectError('VALIDATION_ERROR', { fields: { recipient: check.error } });
  try {
    const { notice, letter } = await getApprovedLetter(session, params.id, { recipient });
    const body = await letterDocx(letter);
    return new Response(body, { status: 200, headers: {
      'content-type': DOCX_TYPE,
      'content-disposition': `attachment; filename="notice-${slug(notice.province?.name ?? notice.province_name)}.docx"`,
      'cache-control': 'private, no-store'
    } });
  } catch (err) {
    return fromProjectError(err);
  }
}
