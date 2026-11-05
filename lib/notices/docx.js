// Word file of an approved letter (M7 BR-002; specs/006-m7-support research R4), built with docx on the server.
import { Document, Packer, Paragraph, TextRun } from 'docx';

/** @returns {Promise<Buffer>} the .docx of buildLetter()'s paragraphs, Vietnamese then English */
export async function letterDocx(letter) {
  const children = [];
  letter.paragraphs.forEach((p, i) => {
    const prev = letter.paragraphs[i - 1];
    if (prev && prev.lang !== p.lang) children.push(new Paragraph({ children: [] }));   // a blank line between the two languages
    children.push(new Paragraph({ children: [new TextRun({ text: p.text, font: 'Times New Roman', size: 26 })], spacing: { after: 160 } }));
  });
  const doc = new Document({ creator: 'CINEMATCH', title: 'Provincial notice', sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
