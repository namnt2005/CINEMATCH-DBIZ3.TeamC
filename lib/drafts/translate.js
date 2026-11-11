// Vietnamese drafts of the paragraphs (M5 FR-004, Clarifications Q3, BR-006; specs/009-m5-dossier R5, analysis U1).
// The text goes to the language model ONLY with LLM_PROVIDER=gemini, GEMINI_PAID_TIER=true, a key, a model and the
// user's tick (consent === true). LLM_PROVIDER=mock gives a fake translation outside production only. Otherwise nothing
// is translated and the Vietnamese column stays empty for a person to fill in.
import { applyGlossary } from './glossary.js';
import { translateBatch } from './gemini-translator.js';

export const BATCH = 5;
const paid = (env) => String(env.LLM_PROVIDER || '').toLowerCase().trim() === 'gemini' && String(env.GEMINI_PAID_TIER).trim() === 'true'
  && Boolean(env.GEMINI_API_KEY) && Boolean(env.GEMINI_MODEL);
const mockAllowed = (env) => String(env.LLM_PROVIDER || '').toLowerCase().trim() === 'mock' && env.NODE_ENV !== 'production';

/** What SC-28 may offer: the paid model (needs the tick), the fake translator (development), or nothing. */
export function translationMode(env = process.env) {
  if (paid(env)) return { available: true, consent_needed: true, mode: 'gemini' };
  if (mockAllowed(env)) return { available: true, consent_needed: false, mode: 'mock' };
  return { available: false, consent_needed: false, mode: 'none' };
}

/** → { method, translations: [{ idx, target_text }], failed: [idx] }. A failed batch fails only its own paragraphs. */
export async function translateParagraphs({ paragraphs = [], glossary = [], consent = false }, { env = process.env, client, timeoutMs } = {}) {
  const empty = () => paragraphs.map(p => ({ idx: p.idx, target_text: '' }));
  if (paid(env) && consent === true) {
    const got = new Map();
    for (let i = 0; i < paragraphs.length; i += BATCH) {
      const batch = paragraphs.slice(i, i + BATCH);
      try {
        for (const t of await translateBatch(batch, { glossary, apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, client, timeoutMs })) got.set(t.idx, t.target_text);
      } catch {
        // the paragraphs of this batch stay empty with "Could not translate — retry this paragraph"
      }
    }
    return { method: 'gemini', translations: paragraphs.map(p => ({ idx: p.idx, target_text: got.get(p.idx) ?? '' })),
      failed: paragraphs.filter(p => !got.has(p.idx)).map(p => p.idx) };
  }
  if (!paid(env) && mockAllowed(env)) {
    return { method: 'mock', translations: paragraphs.map(p => ({ idx: p.idx, target_text: `[VI] ${applyGlossary(p.source_text, glossary)}` })), failed: [] };
  }
  return { method: 'none', translations: empty(), failed: [] };
}
