// Project documents in the private bucket `project-documents` (M5 FR-002, SR-154; specs/009-m5-dossier R3, D2).
// One bucket, a folder per project: <project_id>/<doc_code>/<uuid>.<pdf|docx>, and generated drafts under
// <project_id>/<doc_code>/drafts/<uuid>.pdf. The browser never reads or lists the bucket: the server checks the caller,
// then hands out signed URLs (upload 300 s, download 60 s). Offline the same interface writes under the OS temp folder;
// tests use the in-memory adapter. Access checks live in lib/db (documents, drafts).
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isSupabase } from '../db/source.js';

export const PROJECT_DOCUMENTS_BUCKET = 'project-documents';
export const MAX_BYTES = 25 * 1024 * 1024;
export const UPLOAD_SECONDS = 300;
export const DOWNLOAD_SECONDS = 60;
export const ALLOWED_TYPES = Object.freeze(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
export const TYPE_OF_EXT = Object.freeze({ pdf: ALLOWED_TYPES[0], docx: ALLOWED_TYPES[1] });
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const CODE = /^[A-Z0-9_]{1,40}$/;

export function uploadPathFor(projectId, docCode, ext) {
  if (!TYPE_OF_EXT[ext] || !CODE.test(docCode)) throw new Error('bad upload path');
  return `${projectId}/${docCode}/${randomUUID()}.${ext}`;
}
export const draftPdfPathFor = (projectId, docCode) => `${projectId}/${docCode}/drafts/${randomUUID()}.pdf`;

/** True for `<projectId>/<docCode>/<uuid>.pdf|docx` only (no other folder, no `..`, no leading slash). */
export function isPathOf(projectId, docCode, p) {
  if (typeof p !== 'string' || p.includes('..') || p.startsWith('/')) return false;
  return new RegExp(`^${projectId}/${docCode}/${UUID}\\.(pdf|docx)$`).test(p);
}

/** The kind of a stored file from its first bytes: '%PDF-' → pdf, a ZIP header ('PK\x03\x04') → docx. */
export function kindOfBytes(bytes) {
  const b = Buffer.from(bytes || []);
  if (b.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'docx';
  return null;
}

/** Tests: an in-memory store. */
export function memoryAdapter() {
  const objects = new Map();
  return {
    objects,
    async write(p, bytes) { objects.set(p, Buffer.from(bytes)); },
    async head(p) { const o = objects.get(p); return o ? { size: o.length, kind: kindOfBytes(o) } : null; },
    async remove(p) { objects.delete(p); },
    async signedUpload(p) { return { url: `memory://upload/${p}?token=${randomUUID()}` }; },
    async signedDownload(p, seconds) { return objects.has(p) ? { url: `memory://download/${p}?expires=${seconds}` } : null; }
  };
}

/** Offline: files under <tmp>/cinematch-project-documents, served by /api/dev/project-documents (development only). */
export function localAdapter(root = path.join(os.tmpdir(), 'cinematch-project-documents')) {
  const inside = (p) => {
    const full = path.resolve(root, p);
    if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error('path outside the store');
    return full;
  };
  return {
    root,
    async write(p, bytes) { const full = inside(p); await fs.mkdir(path.dirname(full), { recursive: true }); await fs.writeFile(full, bytes); },
    async read(p) { return fs.readFile(inside(p)).catch(() => null); },
    async head(p) {
      const buf = await fs.readFile(inside(p)).catch(() => null);
      return buf ? { size: buf.length, kind: kindOfBytes(buf) } : null;
    },
    async remove(p) { await fs.rm(inside(p), { force: true }); },
    async signedUpload(p) { return { url: `/api/dev/project-documents/${p}` }; },
    async signedDownload(p) { return (await fs.stat(inside(p)).catch(() => null)) ? { url: `/api/dev/project-documents/${p}` } : null; }
  };
}

/** Supabase Storage through the System client: signed URLs only, never a public URL (SR-154). */
export function supabaseAdapter(client) {
  const bucket = () => client.storage.from(PROJECT_DOCUMENTS_BUCKET);
  return {
    async write(p, bytes, contentType = 'application/pdf') {
      const { error } = await bucket().upload(p, bytes, { contentType, upsert: false });
      if (error) throw Object.assign(new Error(error.message), { code: 'STORAGE' });
    },
    async head(p) {
      const { data, error } = await bucket().download(p);
      if (error || !data) return null;
      const buf = Buffer.from(await data.arrayBuffer());
      return { size: buf.length, kind: kindOfBytes(buf) };
    },
    async remove(p) { await bucket().remove([p]); },
    async signedUpload(p) {
      const { data, error } = await bucket().createSignedUploadUrl(p);
      if (error) throw Object.assign(new Error(error.message), { code: 'STORAGE' });
      return { url: data.signedUrl, token: data.token };
    },
    async signedDownload(p, seconds) {
      const { data, error } = await bucket().createSignedUrl(p, seconds);
      return error || !data ? null : { url: data.signedUrl };
    }
  };
}

let testAdapter = null;
/** Tests only: a store used instead of the real one (null restores it). */
export function setProjectDocumentsForTests(adapter) { testAdapter = adapter; }
export async function projectStore() {
  if (testAdapter) return testAdapter;
  if (isSupabase()) {
    const { getAdminClient } = await import('../supabase/admin.js');
    return supabaseAdapter(await getAdminClient());
  }
  return localAdapter();
}
