import { serializeFilterState } from '../use-filter-state.js';
import { dictionary, translate } from '../../../lib/i18n/index.js';

/**
 * Pure view helpers for SC-15, kept out of page.js so they can be tested with node --test.
 */

// BR-003: no month is assumed; the field stays empty until the extractor or the user sets one
export const DEFAULT_SHOOT_MONTH = null;

// Without a translator from the page, the month list reads Vietnamese and the chips English (the defaults
// of the earlier screens and their tests); the page passes the user's translator (FR-006)
const VI = (key, vars) => translate(dictionary('vi'), key, vars);
const EN = (key, vars) => translate(dictionary('en'), key, vars);

export function monthOptions(t = VI) {
  return [
    { value: '', label: t('month.any') },
    ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: t('month.n', { month: i + 1 }) }))
  ];
}

function validMonth(value) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

// Preset the field only from a shoot_month the extractor actually returned
export function monthFromExtraction(extraction) {
  return validMonth(extraction?.attributes?.shoot_month);
}

export function monthFromSelect(value) {
  return value === '' ? null : validMonth(value);
}

export function searchQuery(extraction, shootMonth) {
  return serializeFilterState({
    scene_types: extraction?.attributes?.scene_types || [],
    crew_size: extraction?.attributes?.crowd_scale || null,
    shoot_month: shootMonth
  });
}

/**
 * Chips for "What the system understood", in display order: scene types, era, crew size, time of day.
 * A chip appears only for a value the extractor returned.
 */
export function extractionChips(extraction, t = EN) {
  const a = extraction?.attributes || {};
  const label = (prefix, value) => t(prefix, { value });
  const known = (key, fallback) => { const text = t(key); return text === key ? fallback : text; };
  const chips = (a.scene_types || []).map(type => ({ kind: 'scene', key: `scene-${type}`, label: label('match.chip.scene', known(`scene.${type}`, type)) }));
  if (a.era) chips.push({ kind: 'era', key: 'era', label: label('match.chip.era', known(`era.${a.era}`, a.era)) });
  if (a.crowd_scale) chips.push({ kind: 'crew', key: 'crew', label: label('match.chip.crew', known(`match.crew.${a.crowd_scale}`, a.crowd_scale)) });
  for (const time of a.time_of_day || []) {
    chips.push({ kind: 'time', key: `time-${time}`, label: label('match.chip.time', known(`time.${time}`, time)) });
  }
  return chips;
}

// The fallback is the rule-based extractor, so it reads "luật" too
export function extractorLabel(extraction, t = VI) {
  return extraction?.provider === 'gemini' ? t('match.extractor.gemini') : t('match.extractor.rules');
}
