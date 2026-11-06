// Business registration PDFs in the private bucket `org-documents` (M4 FR-008, SR-335; specs/007-m4-partners R10).
// The browser never reads or lists the bucket: the server checks the caller, then hands out signed URLs (upload 300 s,
// download 60 s). Offline the same interface writes under the OS temp folder; tests use the in-memory adapter.
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PartnerError } from '../partners/errors.js';
import { actsFor, isStaffRole } from '../db/partner-access.js';
import { isSupabase } from '../db/source.js';

export const ORG_DOCUMENTS_BUCKET = 'org-documents';
export const MAX_BYTES = 25 * 1024 * 1024;
const UPLOAD_SECONDS = 300;
const DOWNLOAD_SECONDS = 60;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

export const verificationPathFor = (orgId) => `${orgId}/verification/${randomUUID()}.pdf`;

/** True for `<orgId>/verification/<name>.pdf` and nothing else (no other folder, no `..`, no leading slash). */
export function isVerificationPathOf(orgId, p) {
  if (typeof p !== 'string' || p.includes('..') || p.startsWith('/')) return false;
  return new RegExp(`^${orgId}/verification/[A-Za-z0-9_-]+\\.pdf$`).test(p);
}
const orgOfPath = (p) => (new RegExp(`^(${UUID})/verification/`).exec(String(p || '')) || [])[1] || null;

/** Tests: an in-memory store. */
export function memoryAdapter() {
  const objects = new Map();
  return {
    put(p, bytes, { size } = {}) { objects.set(p, { bytes: Buffer.from(bytes), size: size ?? Buffer.from(bytes).length }); },
    async head(p) { const o = objects.get(p); return o ? { size: o.size, start: o.bytes.subarray(0, 5).toString('latin1') } : null; },
    async signedUpload(p) { return { url: `memory://upload/${p}?token=${randomUUID()}` }; },
    async signedDownload(p, seconds) { return objects.has(p) ? { url: `memory://download/${p}?expires=${seconds}` } : null; }
  };
}

/** Offline: files under <tmp>/cinematch-org-documents, served by /api/dev/org-documents (development only). */
export function localAdapter(root = path.join(os.tmpdir(), 'cinematch-org-documents')) {
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
      return buf ? { size: buf.length, start: buf.subarray(0, 5).toString('latin1') } : null;
    },
    async signedUpload(p) { return { url: `/api/dev/org-documents/${p}` }; },
    async signedDownload(p) { return (await fs.stat(inside(p)).catch(() => null)) ? { url: `/api/dev/org-documents/${p}` } : null; }
  };
}

/** Supabase Storage through the System client: signed URLs only, never a public URL (SR-335). */
export function supabaseAdapter(client) {
  const bucket = () => client.storage.from(ORG_DOCUMENTS_BUCKET);
  return {
    async head(p) {
      const { data, error } = await bucket().download(p);
      if (error || !data) return null;
      const buf = Buffer.from(await data.arrayBuffer());
      return { size: buf.length, start: buf.subarray(0, 5).toString('latin1') };
    },
    async signedUpload(p) {
      const { data, error } = await bucket().createSignedUploadUrl(p);
      if (error) throw new PartnerError('FILE_INVALID');
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
export function setOrgDocumentsForTests(adapter) { testAdapter = adapter; }
async function store() {
  if (testAdapter) return testAdapter;
  if (isSupabase()) {
    const { getAdminClient } = await import('../supabase/admin.js');
    return supabaseAdapter(await getAdminClient());
  }
  return localAdapter();
}

const signedIn = (session) => Boolean(session?.isAuthenticated && session.userId);

/** A signed upload URL for a new PDF of the caller's organisation (FR-008: PDF, at most 25 MB). */
export async function requestUpload(session, orgId, { size, content_type: type } = {}) {
  if (!signedIn(session)) throw new PartnerError('UNAUTHENTICATED');
  if (!(await actsFor(session, orgId))) throw new PartnerError('FORBIDDEN');
  if (type !== 'application/pdf' || !Number.isFinite(Number(size)) || Number(size) <= 0 || Number(size) > MAX_BYTES) throw new PartnerError('FILE_INVALID');
  const p = verificationPathFor(orgId);
  const signed = await (await store()).signedUpload(p);
  return { path: p, upload_url: signed.url, expires_in: UPLOAD_SECONDS };
}

/** The uploaded object exists under the organisation's folder, is at most 25 MB and starts with %PDF-. */
export async function checkUpload(orgId, p) {
  if (!isVerificationPathOf(orgId, p)) return { ok: false, reason: 'path' };
  const head = await (await store()).head(p);
  if (!head) return { ok: false, reason: 'missing' };
  if (head.size > MAX_BYTES) return { ok: false, reason: 'size' };
  if (head.start !== '%PDF-') return { ok: false, reason: 'type' };
  return { ok: true, size: head.size };
}

/** A signed download URL (60 s) for VFDA staff and the organisation's own users. */
export async function requestDownload(session, p) {
  if (!signedIn(session)) throw new PartnerError('UNAUTHENTICATED');
  const orgId = orgOfPath(p);
  if (!isStaffRole(session) && !(orgId && await actsFor(session, orgId))) throw new PartnerError('FORBIDDEN');
  const signed = await (await store()).signedDownload(p, DOWNLOAD_SECONDS);
  if (!signed) throw new PartnerError('FILE_MISSING');
  return { url: signed.url, expires_in: DOWNLOAD_SECONDS };
}
