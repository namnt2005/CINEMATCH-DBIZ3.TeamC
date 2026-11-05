import { createProject, listProjects } from '../../../lib/db/projects.js';
import { listProvinces } from '../../../lib/db/provinces.js';
import { validateProjectInput } from '../../../lib/projects/input.js';
import { STAGES } from '../../../lib/db/project-shape.js';
import { projectError, fromProjectError, memberSession, readBody } from '../../../lib/api/projects.js';

/** POST /api/projects — FR-001: name, format, segment (+ optional details); the creator becomes the owner. */
export async function POST(req) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  const provinceIds = (await listProvinces()).map(p => p.province_id);
  const { ok, errors, value } = validateProjectInput(await readBody(req), { provinceIds });
  if (!ok) return projectError('VALIDATION_ERROR', { fields: errors });
  try {
    return Response.json(await createProject(session, value), { status: 201 });
  } catch (err) {
    return fromProjectError(err);
  }
}

/** GET /api/projects?stage= — FR-003: the caller's projects with the view's readiness; archived only on request (BR-005). */
export async function GET(req) {
  const session = await memberSession(req);
  if (!session) return projectError('UNAUTHENTICATED');
  const stage = new URL(req.url).searchParams.get('stage') || null;
  if (stage && !STAGES.includes(stage)) return projectError('VALIDATION_ERROR', { fields: { stage: 'projects.api.validation' } });
  return Response.json(await listProjects(session, { stage }));
}
