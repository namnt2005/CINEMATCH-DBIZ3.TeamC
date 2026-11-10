// Pre-check input (M2 FR-005, research R2 step 1, decision D12). Every error is a dictionary key in both languages.
import { createHash } from 'node:crypto';

import { MIN_WORDS, MAX_WORDS, FLAG_KEYS, FLAG_VALUES, normalise, countWords } from './words.js';

export { MIN_WORDS, MAX_WORDS, FLAG_KEYS, FLAG_VALUES, countWords };

/** SHA-256 (hex) of the trimmed text with whitespace collapsed (FR-007, Clarifications Q6): the only trace kept. */
export const synopsisHash = (text) => createHash('sha256').update(normalise(text)).digest('hex');

export function validatePrecheckInput(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = {};
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const n = countWords(text);
  if (n < MIN_WORDS || n > MAX_WORDS) errors.text = 'precheck.error.words';
  if (!['en', 'vi'].includes(b.lang)) errors.lang = 'precheck.error.lang';
  let flags = null;
  if (b.flags !== undefined && b.flags !== null) {
    const ok = typeof b.flags === 'object' && !Array.isArray(b.flags)
      && Object.entries(b.flags).every(([k, v]) => FLAG_KEYS.includes(k) && FLAG_VALUES.includes(v));
    if (!ok) errors.flags = 'precheck.error.flags';
    else flags = Object.keys(b.flags).length ? { ...b.flags } : null;
  }
  if (Object.keys(errors).length) return { ok: false, errors, value: null };
  return { ok: true, errors: {}, value: { text, lang: b.lang, flags, consent_advanced: b.consent_advanced === true } };
}
