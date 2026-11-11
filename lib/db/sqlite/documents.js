import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam } from '../audit.js';
import { CheckError } from '../../checks/errors.js';
import { shapeKit, validSegment } from '../../documents/shape.js';
import { assertEditor, signedUploadFor, checkStored } from '../../documents/upload.js';
import { projectStore, DOWNLOAD_SECONDS } from '../../storage/project-documents.js';
import { userOf, permissionOf } from './partner-access.js';
import { logDocumentView } from './document-log.js';

// node:sqlite source of SC-26 and the twin of app_record_document (20261111000100_m5_dossier.sql).

function project(session, projectId) {
  if (!userOf(session)) throw new CheckError('UNAUTHENTICATED');
  const p = getOne('SELECT project_id, segment, stage FROM project WHERE project_id = ?', [projectId]);
  const permission = p ? permissionOf(session, projectId) : null;
  if (!p || !permission) throw new CheckError('NOT_FOUND');
  return { project: p, permission };
}

function readRows(projectId) {
  const documents = query('SELECT document_id, doc_code, version, uploaded_by, uploaded_at FROM document WHERE project_id = ?', [projectId]);
  const names = Object.fromEntries(query('SELECT user_id, full_name FROM profile').map(r => [r.user_id, r.full_name]));
  return {
    requirements: query('SELECT segment, requirement_code, label_vi, label_en, needed FROM segment_requirement'),
    types: query('SELECT * FROM document_type ORDER BY doc_code'),
    shortlistIds: query('SELECT location_id FROM project_shortlist WHERE project_id = ?', [projectId]).map(r => r.location_id),
    links: query('SELECT location_id, doc_code FROM location_document_type'),
    slots: query('SELECT doc_code, state FROM document_slot WHERE project_id = ?', [projectId]),
    dossier: query('SELECT doc_code, state FROM v_dossier_check WHERE project_id = ?', [projectId]),
    noticeDone: Boolean(getOne(`SELECT 1 AS ok FROM province_notice n JOIN location_interest i ON i.interest_id = n.interest_id
      WHERE i.project_id = ? AND n.review_status = 'approved' AND n.sent_at IS NOT NULL LIMIT 1`, [projectId])),
    documents, names
  };
}

export async function getKit(session, projectId, { segment = null } = {}) {
  const viewing = validSegment(segment);
  const { project: p, permission } = project(session, projectId);
  return shapeKit({ project: p, permission, viewing, rows: readRows(projectId) });
}

const ownKit = (p, permission) => shapeKit({ project: p, permission, rows: readRows(p.project_id) });

export async function requestUpload(session, projectId, body = {}) {
  const { project: p, permission } = project(session, projectId);
  assertEditor(permission, p);
  return signedUploadFor(projectId, ownKit(p, permission), body);
}

export async function recordDocument(session, projectId, body = {}) {
  const { project: p, permission } = project(session, projectId);
  assertEditor(permission, p);
  await checkStored(projectId, ownKit(p, permission), body);
  const id = randomUUID();
  let version;
  withTransaction((db) => {
    db.prepare(`INSERT INTO document_slot (project_id, doc_code, state) VALUES (?, ?, 'present')
      ON CONFLICT (project_id, doc_code) DO UPDATE SET state = 'present'`).run(projectId, body.doc_code);
    version = Number(db.prepare('SELECT COALESCE(MAX(version), 0) + 1 AS v FROM document WHERE project_id = ? AND doc_code = ?').get(projectId, body.doc_code).v);
    db.prepare('INSERT INTO document (document_id, project_id, doc_code, file_path, version, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, projectId, body.doc_code, body.path, version, session.userId, nowInVietnam());
  });
  return { document_id: id, version, state: 'present' };
}

export async function listVersions(session, projectId, docCode) {
  project(session, projectId);
  const names = Object.fromEntries(query('SELECT user_id, full_name FROM profile').map(r => [r.user_id, r.full_name]));
  return query('SELECT document_id, version, uploaded_by, uploaded_at FROM document WHERE project_id = ? AND doc_code = ? ORDER BY version DESC', [projectId, docCode])
    .map(d => ({ document_id: d.document_id, version: Number(d.version), uploaded_at: d.uploaded_at, uploaded_by_name: names[d.uploaded_by] ?? null }));
}

export async function documentForDownload(session, documentId) {
  if (!userOf(session)) throw new CheckError('UNAUTHENTICATED');
  const doc = getOne('SELECT document_id, project_id, file_path FROM document WHERE document_id = ?', [documentId]);
  if (!doc || !permissionOf(session, doc.project_id)) throw new CheckError('NOT_FOUND');
  logDocumentView(session, documentId);                              // SR-154: one append-only row per download
  const signed = await (await projectStore()).signedDownload(doc.file_path, DOWNLOAD_SECONDS);
  if (!signed) throw new CheckError('NOT_FOUND');
  return { url: signed.url, expires_in: DOWNLOAD_SECONDS };
}
