// The English source from a .docx (M5 decision D3; specs/009-m5-dossier R10): read in memory, never stored — it is the
// production's confidential script. 4 MB: the file passes through a Route Handler (request body limit on the host).
import mammoth from 'mammoth';
import { CheckError } from '../checks/errors.js';

export const DOCX_MAX = 4 * 1024 * 1024;
const refuse = () => new CheckError('VALIDATION_ERROR', { file: 'drafts.error.docx' });

export async function textFromDocx(buffer) {
  const b = Buffer.from(buffer || []);
  if (b.length > DOCX_MAX || b[0] !== 0x50 || b[1] !== 0x4b || b[2] !== 0x03 || b[3] !== 0x04) throw refuse();
  try {
    const { value } = await mammoth.extractRawText({ buffer: b });
    return value;
  } catch {
    throw refuse();
  }
}
