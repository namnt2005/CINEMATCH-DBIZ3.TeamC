import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Private file store for business registration PDFs (T037, R10, SR-335): bucket `org-documents`, signed URLs only.
const store = () => import('../../lib/storage/org-documents.js');
const BEN_XUA = '67fc4355-67c0-55f3-a64b-1ad3381c6fdf';
const MEKONG = '35683fa1-af07-55a0-8bdd-276a37becc29';
const LAN = { role: 'partner', isAuthenticated: true, userId: 'ccc2764e-7734-5390-9c71-46963d2f7820' };   // Bến Xưa
const TUAN = { role: 'partner', isAuthenticated: true, userId: '1396ef42-92a1-55ca-bfd0-199050d5411b' };  // Mekong Frame
const STAFF = { role: 'vfda_staff', isAuthenticated: true, userId: '515529a9-46d9-559c-aab4-e5fb31eedeea' };
const YUI = { role: 'member', isAuthenticated: true, userId: '118de3c8-88eb-5003-a2f9-26bbdd0186ae' };
const GUEST = { role: 'guest', isAuthenticated: false, userId: null };
const PDF = Buffer.from('%PDF-1.7\n% test registration\n');
const MB = 1024 * 1024;

// A fake Supabase Storage client that records every call; it can also hand out public URLs, which must never be asked for
function fakeSupabaseStorage() {
  const calls = [];
  const objects = new Map();
  const bucket = (name) => ({
    createSignedUploadUrl: async (p) => { calls.push(['signedUpload', name, p]); return { data: { signedUrl: `https://x.supabase.co/storage/v1/object/upload/sign/${name}/${p}?token=up`, token: 'up', path: p }, error: null }; },
    createSignedUrl: async (p, seconds) => { calls.push(['signedDownload', name, p, seconds]); return { data: { signedUrl: `https://x.supabase.co/storage/v1/object/sign/${name}/${p}?token=down` }, error: null }; },
    download: async (p) => { calls.push(['download', name, p]); const b = objects.get(p); return b ? { data: new Blob([b]), error: null } : { data: null, error: { message: 'Object not found', statusCode: '404' } }; },
    getPublicUrl: (p) => { calls.push(['publicUrl', name, p]); return { data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/${name}/${p}` } }; }
  });
  return { calls, objects, client: { storage: { from: bucket } } };
}

describe('Private file store org-documents (T037)', () => {
  afterEach(async () => { (await store()).setOrgDocumentsForTests(null); });

  test('the bucket is org-documents; files of an organisation live only under <org_id>/verification/', async () => {
    const { ORG_DOCUMENTS_BUCKET, MAX_BYTES, verificationPathFor, isVerificationPathOf } = await store();
    assert.equal(ORG_DOCUMENTS_BUCKET, 'org-documents');
    assert.equal(MAX_BYTES, 25 * MB);
    const p = verificationPathFor(BEN_XUA);
    assert.match(p, new RegExp(`^${BEN_XUA}/verification/[0-9a-f-]{36}\\.pdf$`));
    assert.notEqual(verificationPathFor(BEN_XUA), p, 'a new name each time');
    assert.equal(isVerificationPathOf(BEN_XUA, p), true);
    for (const bad of [`${MEKONG}/verification/x.pdf`, `${BEN_XUA}/other/x.pdf`, `${BEN_XUA}/verification/../../${MEKONG}/verification/x.pdf`, `/${p}`]) {
      assert.equal(isVerificationPathOf(BEN_XUA, bad), false, bad);
    }
  });

  test('a signed upload URL only for a user of that organisation, only for a PDF of at most 25 MB', async () => {
    const { requestUpload, setOrgDocumentsForTests, memoryAdapter } = await store();
    setOrgDocumentsForTests(memoryAdapter());
    const ok = await requestUpload(LAN, BEN_XUA, { size: 2 * MB, content_type: 'application/pdf' });
    assert.match(ok.path, new RegExp(`^${BEN_XUA}/verification/`));
    assert.equal(ok.expires_in, 300);
    assert.ok(ok.upload_url);
    for (const [session, code] of [[TUAN, 'FORBIDDEN'], [STAFF, 'FORBIDDEN'], [YUI, 'FORBIDDEN'], [GUEST, 'UNAUTHENTICATED']]) {
      await assert.rejects(() => requestUpload(session, BEN_XUA, { size: MB, content_type: 'application/pdf' }), (e) => e.code === code, session.role);
    }
    await assert.rejects(() => requestUpload(LAN, BEN_XUA, { size: 25 * MB + 1, content_type: 'application/pdf' }), (e) => e.code === 'FILE_INVALID');
    await assert.rejects(() => requestUpload(LAN, BEN_XUA, { size: MB, content_type: 'image/png' }), (e) => e.code === 'FILE_INVALID');
  });

  test('the uploaded object is checked: it exists, is at most 25 MB and starts with %PDF-', async () => {
    const { checkUpload, setOrgDocumentsForTests, memoryAdapter } = await store();
    const memory = memoryAdapter();
    setOrgDocumentsForTests(memory);
    const good = `${BEN_XUA}/verification/11111111-1111-4111-8111-111111111111.pdf`;
    memory.put(good, PDF);
    assert.deepEqual(await checkUpload(BEN_XUA, good), { ok: true, size: PDF.length });
    const png = `${BEN_XUA}/verification/22222222-2222-4222-8222-222222222222.pdf`;
    memory.put(png, Buffer.from('\x89PNG\r\n'));
    const big = `${BEN_XUA}/verification/33333333-3333-4333-8333-333333333333.pdf`;
    memory.put(big, PDF, { size: 25 * MB + 1 });
    for (const p of [png, big, `${BEN_XUA}/verification/44444444-4444-4444-8444-444444444444.pdf`, `${MEKONG}/verification/x.pdf`]) {
      assert.equal((await checkUpload(BEN_XUA, p)).ok, false, p);
    }
  });

  test('a signed download URL valid 60 s only for staff and the organisation\'s own users', async () => {
    const { requestDownload, setOrgDocumentsForTests, memoryAdapter } = await store();
    const memory = memoryAdapter();
    setOrgDocumentsForTests(memory);
    const p = `${BEN_XUA}/verification/11111111-1111-4111-8111-111111111111.pdf`;
    memory.put(p, PDF);
    for (const session of [STAFF, LAN]) {
      const link = await requestDownload(session, p);
      assert.equal(link.expires_in, 60, session.role);
      assert.ok(link.url);
    }
    for (const [session, code] of [[TUAN, 'FORBIDDEN'], [YUI, 'FORBIDDEN'], [GUEST, 'UNAUTHENTICATED']]) {
      await assert.rejects(() => requestDownload(session, p), (e) => e.code === code, session.role);
    }
    await assert.rejects(() => requestDownload(STAFF, 'private/verification/v1/business-registration.pdf'), (e) => e.code === 'FILE_MISSING', 'seed paths have no file');
  });

  test('SR-335: on Supabase only signed URLs are asked for — never a public URL — and none is public-looking', async () => {
    const { supabaseAdapter, setOrgDocumentsForTests, requestUpload, requestDownload } = await store();
    const fake = fakeSupabaseStorage();
    const p = `${BEN_XUA}/verification/11111111-1111-4111-8111-111111111111.pdf`;
    fake.objects.set(p, PDF);
    setOrgDocumentsForTests(supabaseAdapter(fake.client));
    const up = await requestUpload(LAN, BEN_XUA, { size: MB, content_type: 'application/pdf' });
    const down = await requestDownload(STAFF, p);
    assert.ok(fake.calls.some(c => c[0] === 'signedUpload' && c[1] === 'org-documents'));
    assert.ok(fake.calls.some(c => c[0] === 'signedDownload' && c[1] === 'org-documents' && c[3] === 60));
    assert.equal(fake.calls.some(c => c[0] === 'publicUrl'), false, 'getPublicUrl is never called');
    for (const url of [up.upload_url, down.url]) assert.doesNotMatch(url, /\/object\/public\//);
    assert.ok(fake.calls.every(c => c[1] === 'org-documents'), 'no other bucket');
  });

  test('offline, the local adapter writes under the OS temp folder, never inside the repository', async () => {
    const { localAdapter } = await store();
    const local = localAdapter();
    assert.ok(local.root.startsWith(fs.realpathSync(os.tmpdir())) || local.root.startsWith(os.tmpdir()), local.root);
    assert.equal(path.relative(process.cwd(), local.root).startsWith('..'), true, 'outside the working directory');
    const p = `${BEN_XUA}/verification/55555555-5555-4555-8555-555555555555.pdf`;
    await local.write(p, PDF);
    assert.ok(fs.existsSync(path.join(local.root, p)));
    await assert.rejects(() => local.write(`${BEN_XUA}/verification/../../../escape.pdf`, PDF), /path/i, 'no escape from the root');
  });

  test('analysis U1: every /api/dev/* route answers 404 when NODE_ENV=production', async () => {
    const saved = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const route = await import('../../app/api/dev/org-documents/[...path]/route.js');
      const req = new Request(`http://localhost:3000/api/dev/org-documents/${BEN_XUA}/verification/a.pdf`, { method: 'PUT', body: PDF });
      const res = await route.PUT(req, { params: { path: [BEN_XUA, 'verification', 'a.pdf'] } });
      assert.equal(res.status, 404);
    } finally {
      process.env.NODE_ENV = saved;
    }
  });
});
