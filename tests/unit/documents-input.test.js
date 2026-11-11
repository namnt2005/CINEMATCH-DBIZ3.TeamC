import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// File checks of SC-26 #13 (T015; M5 FR-002, SR-155, edge case "larger than 25 MB or of another type").
const input = () => import('../../lib/documents/input.js');
const MB = 1024 * 1024;
const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('checkUpload() and suggestDocCode() (T015)', () => {
  test('PDF and DOCX up to 25 MB exactly are accepted, with their extension', async () => {
    const { checkUpload } = await input();
    assert.deepEqual(checkUpload({ filename: 'Undertaking.pdf', content_type: PDF, size: 25 * MB }), { ok: true, ext: 'pdf' });
    assert.deepEqual(checkUpload({ filename: 'crew list.DOCX', content_type: DOCX, size: 1000 }), { ok: true, ext: 'docx' });
  });

  test('another type → FILE_TYPE; 0 bytes or 25 MB + 1 → FILE_TOO_LARGE with the limit', async () => {
    const { checkUpload } = await input();
    for (const f of [{ filename: 'photo.png', content_type: 'image/png', size: 10 }, { filename: 'old.doc', content_type: 'application/msword', size: 10 },
      { filename: 'x.pdf', content_type: 'image/png', size: 10 }, { filename: 'x.png', content_type: PDF, size: 10 }]) {
      const r = checkUpload(f);
      assert.equal(r.ok, false); assert.equal(r.error, 'FILE_TYPE', f.filename);
    }
    for (const size of [0, 25 * MB + 1, -1, 'big']) {
      const r = checkUpload({ filename: 'x.pdf', content_type: PDF, size });
      assert.equal(r.error, 'FILE_TOO_LARGE', String(size));
      assert.equal(r.fields.size, 'documents.error.size');
    }
  });

  test('SR-155: a suggestion is the best-matching kit row, or null; it never assigns by itself', async () => {
    const { suggestDocCode } = await input();
    const rows = [{ doc_code: 'A13_ART9_COMMITMENT', name_en: 'Undertaking not to breach Article 9', name_vi: 'Văn bản cam kết không vi phạm Điều 9' },
      { doc_code: 'FOREIGN_CREW_LIST', name_en: 'Foreign crew list', name_vi: 'Danh sách đoàn làm phim nước ngoài' }];
    assert.equal(suggestDocCode('Undertaking_Article9_signed.pdf', rows), 'A13_ART9_COMMITMENT');
    assert.equal(suggestDocCode('crew-list-final.docx', rows), 'FOREIGN_CREW_LIST');
    assert.equal(suggestDocCode('IMG_2041.pdf', rows), null);
  });
});
