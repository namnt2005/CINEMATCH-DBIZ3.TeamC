import { randomUUID } from 'node:crypto';
import { getOne, query } from '../client.js';
import { nowInVietnam } from '../audit.js';
import { PartnerError } from '../../partners/errors.js';
import { userOf, isProjectMember, isOrgUser, ndaOf } from './partner-access.js';

// node:sqlite twin of app_log_document_view: a project member, or a user of an organisation whose request on the project
// is accepted or confirmed with both NDA rows. Rows are append-only (local-triggers.sql, BR-007).
export function logDocumentView(session, documentId, { now = nowInVietnam() } = {}) {
  if (!userOf(session)) throw new PartnerError('UNAUTHENTICATED');
  const doc = getOne('SELECT project_id FROM document WHERE document_id = ?', [documentId]);
  if (!doc) throw new PartnerError('NOT_FOUND');
  const viaNda = query("SELECT request_id, org_id FROM collab_request WHERE project_id = ? AND status IN ('accepted', 'confirmed')", [doc.project_id])
    .some(r => isOrgUser(session, r.org_id) && ndaOf(r.request_id).producer && ndaOf(r.request_id).partner);
  if (!isProjectMember(session, doc.project_id) && !viaNda) throw new PartnerError('FORBIDDEN');
  const id = randomUUID();
  query('INSERT INTO document_access_log (access_log_id, document_id, viewer_id, viewed_at) VALUES (?, ?, ?, ?)', [id, documentId, session.userId, now]);
  return { access_log_id: id, viewed_at: now };
}
