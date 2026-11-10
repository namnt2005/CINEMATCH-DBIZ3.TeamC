// Passage finding (M2 FR-011, research R3, decisions D4, D12): the language model only with LLM_PROVIDER=gemini, a paid
// plan (GEMINI_PAID_TIER=true, as spec-M5 Q3), a key, a model and the user's tick; otherwise — or on any model error —
// the keyword match. Neither writes the explanation or the level. The key and the summary never reach a log line.
import { matchKeywords } from './keyword-matcher.js';
import { matchWithGemini, MatchError } from './gemini-matcher.js';
import { CheckError } from '../checks/errors.js';

export function advancedAvailable(env = process.env) {
  return String(env.LLM_PROVIDER || 'mock').toLowerCase().trim() === 'gemini' && String(env.GEMINI_PAID_TIER).trim() === 'true'
    && Boolean(env.GEMINI_API_KEY) && Boolean(env.GEMINI_MODEL);
}

export async function findPassages({ text, lang, rules, consent = false }, { env = process.env, client, timeoutMs, keywordMatcher = matchKeywords } = {}) {
  if (consent === true && advancedAvailable(env)) {
    try {
      const pairs = await matchWithGemini(text, { rules, lang, apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, client, timeoutMs });
      return { pairs, method: 'model' };
    } catch (err) {
      const reason = err instanceof MatchError ? err.reason : 'error';
      console.warn(`Content check: language model unavailable (${reason}); keyword matching used.`);
    }
  }
  try {
    return { pairs: keywordMatcher({ text, lang, rules }), method: 'keywords' };
  } catch {
    throw new CheckError('CHECK_UNAVAILABLE');
  }
}
