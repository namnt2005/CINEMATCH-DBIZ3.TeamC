import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// The Word file of an approved letter (T010, BR-002, R4). fflate is the zip library docx 9 depends on.
const NOTICE = { projectName: 'Rice and Salt', provinceName: 'Ninh Bình', summary: 'Rice and Salt — documentary; first shooting day 10/05/2027.' };
async function documentXml(recipient) {
  const { buildLetter } = await import('../../lib/notices/letter.js');
  const { letterDocx } = await import('../../lib/notices/docx.js');
  const buffer = await letterDocx(buildLetter(NOTICE, recipient));
  assert.ok(Buffer.isBuffer(buffer) && buffer.length > 0, 'a .docx buffer');
  const { unzipSync, strFromU8 } = await import('fflate');
  const xml = strFromU8(unzipSync(new Uint8Array(buffer))['word/document.xml']);
  return xml.replace(/<[^>]+>/g, '');   // the visible text of the document
}

describe('letterDocx (T010, BR-002, R4)', () => {
  for (const [recipient, addressee] of [['peoples_committee', 'Ủy ban nhân dân'], ['culture_department', 'Sở Văn hóa, Thể thao và Du lịch']]) {
    test(`BR-002: the .docx to ${recipient} carries the addressee, the project and both sentences`, async () => {
      const text = await documentXml(recipient);
      assert.ok(text.includes(addressee), addressee);
      assert.ok(text.includes('Rice and Salt'));
      assert.ok(text.includes('Thư này không thay thế giấy phép quay phim do Bộ Văn hóa, Thể thao và Du lịch cấp.'));
      assert.ok(text.includes('This letter does not replace the filming licence issued by the Ministry of Culture, Sports and Tourism.'));
    });
  }
});
