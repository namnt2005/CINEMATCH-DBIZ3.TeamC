import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Private store of project documents (T006; M5 FR-002, SR-154, research R3): one bucket `project-documents`, a folder per
// project, signed URLs only (upload 300 s, download 60 s), PDF or DOCX up to 25 MB checked from the stored bytes.
const store = () => import('../../lib/storage/project-documents.js');
const P = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const Q = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';

describe('project-documents store (T006)', () => {
  test('paths: <project>/<doc_code>/<uuid>.<pdf|docx> and <project>/<doc_code>/drafts/<uuid>.pdf', async () => {
    const { uploadPathFor, draftPdfPathFor } = await store();
    assert.match(uploadPathFor(P, 'A13_APPLICATION', 'pdf'), new RegExp(`^${P}/A13_APPLICATION/[0-9a-f-]{36}\\.pdf$`));
    assert.match(uploadPathFor(P, 'A13_APPLICATION', 'docx'), /\.docx$/);
    assert.match(draftPdfPathFor(P, 'A13_SCRIPT_VI'), new RegExp(`^${P}/A13_SCRIPT_VI/drafts/[0-9a-f-]{36}\\.pdf$`));
    assert.throws(() => uploadPathFor(P, 'A13_APPLICATION', 'png'));
  });

  test('isPathOf refuses another project, another code, "..", a leading slash and other extensions', async () => {
    const { uploadPathFor, isPathOf } = await store();
    const good = uploadPathFor(P, 'A13_APPLICATION', 'pdf');
    assert.equal(isPathOf(P, 'A13_APPLICATION', good), true);
    assert.equal(isPathOf(Q, 'A13_APPLICATION', good), false);
    assert.equal(isPathOf(P, 'A13_SCRIPT_VI', good), false);
    for (const bad of [`${P}/A13_APPLICATION/../x.pdf`, `/${good}`, good.replace('.pdf', '.png'), `${P}/A13_APPLICATION/sub/x.pdf`]) {
      assert.equal(isPathOf(P, 'A13_APPLICATION', bad), false, bad);
    }
  });

  test('limits: 25 MB exactly; PDF and DOCX by content type and by their first bytes', async () => {
    const { MAX_BYTES, ALLOWED_TYPES, kindOfBytes } = await store();
    assert.equal(MAX_BYTES, 26214400);
    assert.deepEqual([...ALLOWED_TYPES].sort(), ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    assert.equal(kindOfBytes(Buffer.from('%PDF-1.7')), 'pdf');
    assert.equal(kindOfBytes(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14])), 'docx');
    assert.equal(kindOfBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47])), null);
  });

  test('memory adapter: signed URLs with 300 s and 60 s, head() gives size and kind, remove() deletes', async () => {
    const { memoryAdapter, uploadPathFor, UPLOAD_SECONDS, DOWNLOAD_SECONDS } = await store();
    assert.equal(UPLOAD_SECONDS, 300);
    assert.equal(DOWNLOAD_SECONDS, 60);
    const a = memoryAdapter();
    const p = uploadPathFor(P, 'A13_APPLICATION', 'pdf');
    assert.match((await a.signedUpload(p)).url, /^memory:\/\/upload\//);
    assert.equal(await a.head(p), null);
    await a.write(p, Buffer.from('%PDF-1.7\n'));
    assert.deepEqual(await a.head(p), { size: 9, kind: 'pdf' });
    assert.match((await a.signedDownload(p, DOWNLOAD_SECONDS)).url, /expires=60/);
    await a.remove(p);
    assert.equal(await a.head(p), null);
  });
});
