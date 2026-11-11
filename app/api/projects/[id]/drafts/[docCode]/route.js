import { getDraft, createDraft } from '../../../../../../lib/db/drafts.js';
import { memberSession, isUuid } from '../../../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../../../lib/api/checks.js';
import { DOCX_MAX } from '../../../../../../lib/drafts/docx.js';

export const dynamic = 'force-dynamic';

/** GET /api/projects/:id/drafts/:docCode — SC-28: paragraphs, statuses, rights (D4), glossary, translation mode (Q3). */
export async function GET(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  try {
    return Response.json(await getDraft(session, params.id, params.docCode));
  } catch (err) {
    return fromCheckError(err);
  }
}

/**
 * POST /api/projects/:id/drafts/:docCode — creates the draft from pasted text (JSON { text, consent }) or an English .docx
 * (multipart: file, consent; 4 MB, read in memory and not stored, D3), then translates as Q3 allows (M5 FR-004).
 */
export async function POST(req, { params }) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!isUuid(params?.id)) return checkError('NOT_FOUND');
  let input;
  if ((req.headers.get('content-type') || '').startsWith('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file.arrayBuffer !== 'function' || file.size > DOCX_MAX) return checkError('VALIDATION_ERROR', { fields: { file: 'drafts.error.docx' } });
    input = { docx: Buffer.from(await file.arrayBuffer()), consent: form.get('consent') === 'true' };
  } else {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.text !== 'string') return checkError('VALIDATION_ERROR', { fields: { text: 'drafts.error.text' } });
    input = { text: body.text, consent: body.consent === true };
  }
  try {
    return Response.json(await createDraft(session, params.id, params.docCode, input), { status: 201 });
  } catch (err) {
    return fromCheckError(err);
  }
}
