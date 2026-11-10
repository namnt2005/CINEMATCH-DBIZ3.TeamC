import { listRules, saveDraft } from '../../../../lib/db/legal-rules.js';
import { memberSession, readBody } from '../../../../lib/api/projects.js';
import { checkError, fromCheckError } from '../../../../lib/api/checks.js';
import { validateRule, TOPICS } from '../../../../lib/legal/input.js';

export const dynamic = 'force-dynamic';

const READERS = ['vfda_legal', 'admin'];

/** GET /api/admin/legal-rules?topic=&status= — SC-37 (FR-001): vfda_legal and admin read. */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (!READERS.includes(session.role)) return checkError('FORBIDDEN');
  const q = new URL(req.url).searchParams;
  const topic = q.get('topic') || null;
  const status = q.get('status') || null;
  if ((topic && !TOPICS.includes(topic)) || (status && !['draft', 'approved', 'retired'].includes(status))) return checkError('VALIDATION_ERROR');
  try {
    return Response.json(await listRules(session, { topic, status }));
  } catch (err) {
    return fromCheckError(err);
  }
}

/** POST /api/admin/legal-rules — a new rule as a draft (FR-002); only vfda_legal (D9). */
export async function POST(req) {
  const session = await memberSession(req);
  if (!session) return checkError('UNAUTHENTICATED');
  if (session.role !== 'vfda_legal') return checkError('FORBIDDEN');
  const body = await readBody(req);
  const checked = validateRule(body, { create: true });
  if (!checked.ok) return checkError('VALIDATION_ERROR', { fields: checked.errors });
  try {
    return Response.json(await saveDraft(session, null, body), { status: 201 });
  } catch (err) {
    return fromCheckError(err);
  }
}
