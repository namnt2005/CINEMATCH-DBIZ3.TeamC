import { validateAndMapAttributes } from '../catalog/validator.js';
import { getAllLocationNames } from '../db/locations.js';
import { removeDiacritics } from '../db/search.js';
import { extractWithRules } from './rule-extractor.js';
import { extractWithGemini, ExtractionError, GEMINI_TIMEOUT_MS } from './gemini-extractor.js';

export { GEMINI_TIMEOUT_MS };

/*
 * Common scene extractor interface (F-M3-10..12). Both extractors return the same raw template:
 *   { scene_types: string[], crew_size, shoot_month, era, time_of_day: string[], notes }
 * which is then validated against config/scene-catalog.json here, whichever extractor produced it.
 *
 * Server only: the Gemini key is read from the environment passed in (process.env by default)
 * and is never copied into the result.
 */

// Matched on text without diacritics: "điểm" → diem, "xếp hạng" → xep hang
const SCORE_PATTERN = /\b(score[sd]?|scoring|rank(ed|ing)?|diem|xep hang)\b|\d+\s*(\/\s*100|%|points?\b)/;

let locationNamesCache = null;

function normalize(text) {
  return removeDiacritics(String(text)).toLowerCase();
}

function locationNames() {
  if (!locationNamesCache) locationNamesCache = getAllLocationNames().map(normalize);
  return locationNamesCache;
}

function namesALocation(text) {
  const value = normalize(text);
  return locationNames().some(name => value.includes(name));
}

// BR-001: no location name or score leaves the extractor, whatever the model wrote
function stripLocationMentions(raw) {
  const notes = raw.notes && !namesALocation(raw.notes) && !SCORE_PATTERN.test(normalize(raw.notes))
    ? raw.notes.trim().slice(0, 300)
    : null;
  return {
    ...raw,
    scene_types: raw.scene_types.filter(value => !namesALocation(value)),
    notes
  };
}

function waterFrom(sceneTypes) {
  if (sceneTypes.includes('river')) return 'river';
  if (sceneTypes.includes('sea')) return 'sea';
  return 'none';
}

function finalize(raw, { provider, fallback, reason }) {
  const clean = stripLocationMentions(raw);
  const validation = validateAndMapAttributes({
    scene_types: clean.scene_types,
    crew_size: clean.crew_size,
    shoot_month: clean.shoot_month,
    era: clean.era,
    time_of_day: clean.time_of_day
  });
  const valid = validation.valid_attributes;

  return {
    provider,
    fallback,
    ...(fallback ? { fallback_reason: reason } : {}),
    raw: {
      scene_types: clean.scene_types,
      crew_size: clean.crew_size,
      shoot_month: clean.shoot_month,
      era: clean.era,
      time_of_day: clean.time_of_day
    },
    attributes: {
      scene_types: valid.scene_types || [],
      era: valid.era ?? null,
      time_of_day: valid.time_of_day || [],
      crowd_scale: valid.crew_size ?? null,
      shoot_month: valid.shoot_month ?? null,
      water: waterFrom(valid.scene_types || []),
      notes: clean.notes
    },
    valid_attributes: valid,
    mapped_synonyms: validation.mapped_explanations,
    rejected: validation.rejected,
    editable: true
  };
}

/**
 * Extracts scene attributes from a free-text description.
 * LLM_PROVIDER=mock (default) → rule-based extractor.
 * LLM_PROVIDER=gemini → Gemini; any failure (network, timeout, 429, bad reply, missing key)
 * falls back to the rule-based extractor with `fallback: true` so SC-15 can say so.
 *
 * @param {string} description
 * @param {{ env?: object, geminiClient?: object, timeoutMs?: number }} [options] test seams
 */
export async function extractScene(description, { env = process.env, geminiClient, timeoutMs = GEMINI_TIMEOUT_MS } = {}) {
  const provider = String(env.LLM_PROVIDER || 'mock').toLowerCase().trim();

  if (provider !== 'gemini') {
    return finalize(extractWithRules(description), { provider: 'mock', fallback: false });
  }

  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) {
    return finalize(extractWithRules(description), { provider: 'mock', fallback: true, reason: 'not_configured' });
  }

  try {
    const raw = await extractWithGemini(description, {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      client: geminiClient,
      timeoutMs
    });
    return finalize(raw, { provider: 'gemini', fallback: false });
  } catch (err) {
    const reason = err instanceof ExtractionError ? err.reason : 'error';
    console.warn(`Scene extraction: Gemini unavailable (${reason}), using the rule-based fallback.`);
    return finalize(extractWithRules(description), { provider: 'mock', fallback: true, reason });
  }
}
