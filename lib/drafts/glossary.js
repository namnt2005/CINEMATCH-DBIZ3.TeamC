// The project glossary (M5 BR-006, SC-28 #9, SR-164; specs/009-m5-dossier R6). No node: import.
export const MAX_TERMS = 200;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const word = (term) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, 'giu');

/** Replaces each term_en by its term_vi, whole words only, longest terms first (used by the mock translator). */
export function applyGlossary(text, glossary = []) {
  return [...glossary].sort((a, b) => b.term_en.length - a.term_en.length)
    .reduce((out, g) => out.replace(word(g.term_en), g.term_vi), String(text ?? ''));
}

/** idx of the paragraphs whose source has a term while the Vietnamese lacks its agreed translation (interaction 4). */
export function glossaryMismatches(paragraphs = [], glossary = []) {
  return paragraphs.filter(p => glossary.some(g => word(g.term_en).test(p.source_text || '')
    && !String(p.target_text || '').toLowerCase().includes(g.term_vi.toLowerCase()))).map(p => p.idx);
}

/** { ok, value } or { ok: false, error } — 1–120 characters each, one translation per term (case-insensitive), 200 terms. */
export function validateTerm(body = {}, existing = []) {
  const en = typeof body.term_en === 'string' ? body.term_en.trim() : '';
  const vi = typeof body.term_vi === 'string' ? body.term_vi.trim() : '';
  if (!en || !vi || en.length > 120 || vi.length > 120) return { ok: false, error: 'glossary.error.term' };
  if (existing.some(t => String(t.term_en).toLowerCase() === en.toLowerCase())) return { ok: false, error: 'glossary.error.exists' };
  if (existing.length >= MAX_TERMS) return { ok: false, error: 'glossary.error.limit' };
  return { ok: true, value: { term_en: en, term_vi: vi } };
}
