import { userDb, systemDb, rows } from './util.js';
import { CheckError } from '../../checks/errors.js';
import { shapeDossier } from '../../dossier/check.js';
import { nowInVietnam } from '../audit.js';

// Supabase source of SC-27: membership is read as the user (RLS); v_dossier_check has no API grant, so the System actor
// reads it after that check (the view only uses data the members may see on SC-25 and SC-28).
export async function getDossier(session, projectId, { now = nowInVietnam() } = {}) {
  if (!session?.isAuthenticated || !session.userId) throw new CheckError('UNAUTHENTICATED');
  const db = await userDb();
  const member = rows(await db.from('project_member').select('permission').eq('project_id', projectId).eq('user_id', session.userId).maybeSingle());
  if (!member) throw new CheckError('NOT_FOUND');
  const system = await systemDb();
  const project = rows(await system.from('project').select('project_id, segment').eq('project_id', projectId).maybeSingle());
  if (!project) throw new CheckError('NOT_FOUND');
  const found = rows(await system.from('v_dossier_check').select('doc_code, ord, stored_state, state').eq('project_id', projectId)) || [];
  const types = (rows(await system.from('document_type').select('doc_code, name_vi, name_en, template_url')) || []).filter(t => String(t.doc_code).startsWith('A13_'));
  return shapeDossier(project, found.sort((a, b) => a.ord - b.ord), types, now);
}
