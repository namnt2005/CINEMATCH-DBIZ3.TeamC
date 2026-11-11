import { userDb, systemDb, rows } from './util.js';
import { CheckError, rpcResult } from '../../checks/errors.js';
import { shapeKit, validSegment } from '../../documents/shape.js';
import { assertEditor, signedUploadFor, checkStored } from '../../documents/upload.js';
import { projectStore, DOWNLOAD_SECONDS } from '../../storage/project-documents.js';
import { logDocumentView } from './document-log.js';

// Supabase source of SC-26: membership is read as the user (RLS); the configuration, v_dossier_check (no API grant)
// and the M7 notice state are read by the System actor after that check; versions are recorded through
// app_record_document as the user, which checks the permission again.

async function project(session, projectId) {
  if (!session?.isAuthenticated || !session.userId) throw new CheckError('UNAUTHENTICATED');
  const db = await userDb();
  const member = rows(await db.from('project_member').select('permission, invite_status').eq('project_id', projectId).eq('user_id', session.userId).maybeSingle());
  if (!member || (member.invite_status && member.invite_status !== 'accepted')) throw new CheckError('NOT_FOUND');
  const system = await systemDb();
  const p = rows(await system.from('project').select('project_id, segment, stage').eq('project_id', projectId).maybeSingle());
  if (!p) throw new CheckError('NOT_FOUND');
  return { project: p, permission: member.permission, system };
}

async function readRows(system, projectId) {
  const all = async (q) => rows(await q) || [];
  const [requirements, types, shortlist, links, slots, dossier, interests, documents] = await Promise.all([
    all(system.from('segment_requirement').select('segment, requirement_code, label_vi, label_en, needed')),
    all(system.from('document_type').select('*')),
    all(system.from('project_shortlist').select('location_id').eq('project_id', projectId)),
    all(system.from('location_document_type').select('location_id, doc_code')),
    all(system.from('document_slot').select('doc_code, state').eq('project_id', projectId)),
    all(system.from('v_dossier_check').select('doc_code, state').eq('project_id', projectId)),
    all(system.from('location_interest').select('interest_id').eq('project_id', projectId)),
    all(system.from('document').select('document_id, doc_code, version, uploaded_by, uploaded_at').eq('project_id', projectId))
  ]);
  const notices = interests.length
    ? await all(system.from('province_notice').select('review_status, sent_at').in('interest_id', interests.map(i => i.interest_id)))
    : [];
  const uploaders = [...new Set(documents.map(d => d.uploaded_by))];
  const profiles = uploaders.length ? await all(system.from('profile').select('user_id, full_name').in('user_id', uploaders)) : [];
  return {
    requirements, types: types.sort((a, b) => (a.doc_code < b.doc_code ? -1 : 1)), shortlistIds: shortlist.map(s => s.location_id),
    links, slots, dossier, documents, names: Object.fromEntries(profiles.map(p => [p.user_id, p.full_name])),
    noticeDone: notices.some(n => n.review_status === 'approved' && n.sent_at)
  };
}

export async function getKit(session, projectId, { segment = null } = {}) {
  const viewing = validSegment(segment);
  const { project: p, permission, system } = await project(session, projectId);
  return shapeKit({ project: p, permission, viewing, rows: await readRows(system, projectId) });
}

export async function requestUpload(session, projectId, body = {}) {
  const { project: p, permission, system } = await project(session, projectId);
  assertEditor(permission, p);
  return signedUploadFor(projectId, shapeKit({ project: p, permission, rows: await readRows(system, projectId) }), body);
}

export async function recordDocument(session, projectId, body = {}) {
  const { project: p, permission, system } = await project(session, projectId);
  assertEditor(permission, p);
  await checkStored(projectId, shapeKit({ project: p, permission, rows: await readRows(system, projectId) }), body);
  const db = await userDb();
  const out = rpcResult(await db.rpc('app_record_document', { p_project_id: projectId, p_doc_code: body.doc_code, p_file_path: body.path }));
  return { document_id: out.document_id, version: Number(out.version), state: 'present' };
}

export async function listVersions(session, projectId, docCode) {
  const { system } = await project(session, projectId);
  const docs = rows(await system.from('document').select('document_id, version, uploaded_by, uploaded_at').eq('project_id', projectId).eq('doc_code', docCode)) || [];
  return docs.sort((a, b) => b.version - a.version).map(d => ({ document_id: d.document_id, version: Number(d.version), uploaded_at: d.uploaded_at, uploaded_by_name: null }));
}

export async function documentForDownload(session, documentId) {
  if (!session?.isAuthenticated || !session.userId) throw new CheckError('UNAUTHENTICATED');
  const db = await userDb();
  const doc = rows(await db.from('document').select('document_id, project_id, file_path').eq('document_id', documentId).maybeSingle());
  if (!doc) throw new CheckError('NOT_FOUND');
  const member = rows(await db.from('project_member').select('permission').eq('project_id', doc.project_id).eq('user_id', session.userId).maybeSingle());
  if (!member) throw new CheckError('NOT_FOUND');
  try { await logDocumentView(session, documentId); } catch (err) { if (err?.name === 'PartnerError') throw new CheckError('NOT_FOUND'); throw err; }
  const signed = await (await projectStore()).signedDownload(doc.file_path, DOWNLOAD_SECONDS);
  if (!signed) throw new CheckError('NOT_FOUND');
  return { url: signed.url, expires_in: DOWNLOAD_SECONDS };
}
