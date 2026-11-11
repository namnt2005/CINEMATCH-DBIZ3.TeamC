import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Packer, Paragraph } from 'docx';

// English source from a .docx (T031; decision D3, research R10). The file is built here with the docx library.
const d = () => import('../../lib/drafts/docx.js');
const LINES = ['At dawn the ferryman rows across the river.', 'Soldiers wait on the far bank.', 'The mist lifts over the karst towers.'];

describe('textFromDocx() (T031)', () => {
  test('a .docx gives, through splitParagraphs, the same paragraphs as its text', async () => {
    const { textFromDocx } = await d();
    const { splitParagraphs } = await import('../../lib/drafts/paragraphs.js');
    const doc = new Document({ sections: [{ children: LINES.map(l => new Paragraph(l)) }] });
    const buffer = await Packer.toBuffer(doc);
    assert.deepEqual(splitParagraphs(await textFromDocx(buffer)), LINES);
  });

  test('a file without the PK signature, or over 4 MB, is refused with drafts.error.docx', async () => {
    const { textFromDocx, DOCX_MAX } = await d();
    assert.equal(DOCX_MAX, 4 * 1024 * 1024);
    await assert.rejects(textFromDocx(Buffer.from('%PDF-1.7 not a docx')), (e) => e.code === 'VALIDATION_ERROR' && e.fields?.file === 'drafts.error.docx');
    await assert.rejects(textFromDocx(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(DOCX_MAX)])), (e) => e.fields?.file === 'drafts.error.docx');
  });
});
