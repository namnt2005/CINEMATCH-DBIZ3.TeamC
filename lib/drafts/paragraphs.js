// Paragraphs of the English source of a bilingual draft (M5 FR-004, US-2 Sc1; specs/009-m5-dossier R4). Interim limits
// (research Open question 7). No node: import — SC-28 counts paragraphs in the browser too.
export const LIMITS = Object.freeze({ paragraphs: 100, chars: 4000, total: 60000 });

/** Blank lines split paragraphs; line ends normalised, whitespace collapsed, empty paragraphs dropped. */
export function splitParagraphs(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** null when the paragraphs fit, otherwise the dictionary key of the error. */
export function checkParagraphs(paragraphs) {
  if (!Array.isArray(paragraphs) || paragraphs.length < 1 || paragraphs.length > LIMITS.paragraphs) return 'drafts.error.text';
  if (paragraphs.some(p => typeof p !== 'string' || p.length > LIMITS.chars)) return 'drafts.error.text';
  if (paragraphs.reduce((n, p) => n + p.length, 0) > LIMITS.total) return 'drafts.error.text';
  return null;
}
