import { serializeFilterState } from '../use-filter-state.js';

/**
 * Pure view helpers for SC-15, kept out of page.js so they can be tested with node --test.
 */

// BR-003: no month is assumed; the field stays empty until the extractor or the user sets one
export const DEFAULT_SHOOT_MONTH = null;

const CREW_LABELS = { u15: 'under 15', '15_50': '15–50', o50: 'over 50' };

export function monthOptions() {
  return [
    { value: '', label: 'Bất kỳ tháng nào' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }))
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
export function extractionChips(extraction) {
  const a = extraction?.attributes || {};
  const chips = (a.scene_types || []).map(type => ({ kind: 'scene', key: `scene-${type}`, label: `Scene: ${type}` }));
  if (a.era) chips.push({ kind: 'era', key: 'era', label: `Era: ${a.era}` });
  if (a.crowd_scale) chips.push({ kind: 'crew', key: 'crew', label: `Crew: ${CREW_LABELS[a.crowd_scale] || a.crowd_scale}` });
  for (const time of a.time_of_day || []) {
    chips.push({ kind: 'time', key: `time-${time}`, label: `Time: ${time}` });
  }
  return chips;
}

// The fallback is the rule-based extractor, so it reads "luật" too
export function extractorLabel(extraction) {
  return extraction?.provider === 'gemini' ? 'Bộ trích: Gemini' : 'Bộ trích: luật';
}
