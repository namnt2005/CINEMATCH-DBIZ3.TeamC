import { query, getOne } from '../client.js';
import { nowInVietnam } from '../audit.js';
import { CheckError } from '../../checks/errors.js';
import { shapeDossier } from '../../dossier/check.js';
import { userOf, permissionOf } from './partner-access.js';

// node:sqlite source of SC-27: project members read v_dossier_check of their project (fixed rules, BR-005).
export async function getDossier(session, projectId, { now = nowInVietnam() } = {}) {
  if (!userOf(session)) throw new CheckError('UNAUTHENTICATED');
  const project = getOne('SELECT project_id, segment FROM project WHERE project_id = ?', [projectId]);
  if (!project || !permissionOf(session, projectId)) throw new CheckError('NOT_FOUND');
  const rows = query('SELECT doc_code, ord, stored_state, state FROM v_dossier_check WHERE project_id = ? ORDER BY ord', [projectId]);
  const types = query("SELECT doc_code, name_vi, name_en, template_url FROM document_type WHERE SUBSTR(doc_code, 1, 4) = 'A13_'");
  return shapeDossier(project, rows, types, now);
}
