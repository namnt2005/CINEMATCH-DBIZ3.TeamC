// File checks of SC-26 #13 (M5 FR-002, SR-155; specs/009-m5-dossier R3, R14). No node: import — the upload area uses it.
export const MAX_BYTES = 25 * 1024 * 1024;
const TYPES = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

/** { ok: true, ext } or { ok: false, error: 'FILE_TYPE' | 'FILE_TOO_LARGE', fields } — declared name, type and size. */
export function checkUpload({ filename, content_type: type, size } = {}) {
  const ext = (/\.([a-z0-9]+)$/i.exec(String(filename || '')) || [])[1]?.toLowerCase();
  if (!ext || !TYPES[ext] || TYPES[ext] !== type) return { ok: false, error: 'FILE_TYPE', fields: { file: 'documents.error.type' } };
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_BYTES) return { ok: false, error: 'FILE_TOO_LARGE', fields: { size: 'documents.error.size' } };
  return { ok: true, ext };
}

const words = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  .split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !/^\d+$/.test(w));

/** SR-155: the kit row whose code and names share the most words with the file name, or null. Only a suggestion. */
export function suggestDocCode(filename, rows = []) {
  const name = new Set(words(String(filename).replace(/\.[a-z0-9]+$/i, '').replace(/([a-z])([A-Z0-9])/g, '$1 $2')));
  let best = null, score = 0;
  for (const r of rows) {
    const s = new Set([...words(r.doc_code.replace(/_/g, ' ')), ...words(r.name_en), ...words(r.name_vi)]);
    const hits = [...name].filter(w => s.has(w)).length;
    if (hits > score) { best = r.doc_code; score = hits; }
  }
  return best;
}
