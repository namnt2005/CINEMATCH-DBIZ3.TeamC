// The server-side steps of an upload shared by both data sources (M5 FR-002, SR-155, U3; research R3): what may be
// uploaded, the signed URL, and the check of the stored object before a version is recorded.
import { CheckError } from '../checks/errors.js';
import { checkUpload } from './input.js';
import { kitCodes } from './kit.js';
import { uploadable } from './view.js';
import { projectStore, uploadPathFor, isPathOf, MAX_BYTES, UPLOAD_SECONDS, TYPE_OF_EXT } from '../storage/project-documents.js';

export function assertEditor(permission, project) {
  if (!permission || !project) throw new CheckError('NOT_FOUND');
  if (!['owner', 'edit'].includes(permission)) throw new CheckError('FORBIDDEN');
  if (project.stage === 'archived') throw new CheckError('ARCHIVED');
}

function assertUploadable(kit, docCode) {
  if (typeof docCode !== 'string' || !uploadable({ doc_code: docCode })) {
    throw new CheckError('VALIDATION_ERROR', { doc_code: 'documents.error.not_uploadable' });
  }
  if (!kitCodes(kit).has(docCode)) throw new CheckError('NOT_IN_KIT', { doc_code: 'documents.error.not_in_kit' });
}

export async function signedUploadFor(projectId, kit, body = {}) {
  assertUploadable(kit, body.doc_code);
  const file = checkUpload(body);
  if (!file.ok) throw new CheckError(file.error, file.fields);
  const path = uploadPathFor(projectId, body.doc_code, file.ext);
  const signed = await (await projectStore()).signedUpload(path);
  return { path, upload_url: signed.url, token: signed.token ?? null, expires_in: UPLOAD_SECONDS };
}

/** The stored object exists under the project's folder for that code, is at most 25 MB and is the PDF / DOCX it claims. */
export async function checkStored(projectId, kit, { doc_code: docCode, path } = {}) {
  assertUploadable(kit, docCode);
  if (!isPathOf(projectId, docCode, path)) throw new CheckError('VALIDATION_ERROR', { path: 'documents.error.path' });
  const store = await projectStore();
  const head = await store.head(path);
  if (!head) throw new CheckError('UPLOAD_MISSING');
  const ext = path.split('.').pop();
  if (head.size > MAX_BYTES) { await store.remove(path); throw new CheckError('FILE_TOO_LARGE', { size: 'documents.error.size' }); }
  if (!TYPE_OF_EXT[ext] || head.kind !== ext) { await store.remove(path); throw new CheckError('FILE_TYPE', { file: 'documents.error.type' }); }
  return { size: head.size };
}
