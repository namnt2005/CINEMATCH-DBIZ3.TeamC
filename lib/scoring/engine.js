/**
 * Deterministic 6-criteria scoring engine for CINEMATCH (F-M3-08, BR-001, BR-002, BR-003, BR-010).
 * LLM never ranks or chooses locations; ranking is calculated mathematically.
 */

/**
 * Evaluates an individual scoring criterion with missing data neutrality (BR-003).
 */
export function scoreCriterion(criterionName, locationValue, queryValue) {
  // If location has no recorded data for this criterion, treat as neutral (BR-003)
  if (locationValue === null || locationValue === undefined || locationValue === '') {
    return {
      score: 5,
      maxScore: 10,
      penalty: 0,
      isNeutral: true,
      note: 'No data yet for this criterion (neutral)'
    };
  }

  switch (criterionName) {
    case 'scene_types': {
      const locTypes = Array.isArray(locationValue)
        ? locationValue
        : typeof locationValue === 'string'
          ? (() => {
              try { return JSON.parse(locationValue); } catch { return [locationValue]; }
            })()
          : [];
      
      const qTypes = Array.isArray(queryValue) ? queryValue : [queryValue];
      const matches = locTypes.filter(t => qTypes.includes(t));

      if (matches.length > 0) {
        return {
          score: 10,
          maxScore: 10,
          penalty: 0,
          isNeutral: false,
          note: `Matches scene types: ${matches.join(', ')}`
        };
      }
      return {
        score: 0,
        maxScore: 10,
        penalty: 5,
        isNeutral: false,
        note: 'Does not match requested scene types'
      };
    }

    case 'months_to_avoid': {
      const avoid = Array.isArray(locationValue)
        ? locationValue
        : typeof locationValue === 'string'
          ? (() => {
              try { return JSON.parse(locationValue); } catch { return []; }
            })()
          : [];
      const month = typeof queryValue === 'number' ? queryValue : parseInt(queryValue, 10);
      if (!month) return { score: 10, maxScore: 10, penalty: 0, isNeutral: true, note: 'No month filter' };

      if (avoid.includes(month)) {
        return {
          score: 0,
          maxScore: 10,
          penalty: 5,
          isNeutral: false,
          note: `Month ${month} is marked as a month to avoid`
        };
      }
      return {
        score: 10,
        maxScore: 10,
        penalty: 0,
        isNeutral: false,
        note: `Good conditions in month ${month}`
      };
    }

    default:
      return {
        score: 5,
        maxScore: 10,
        penalty: 0,
        isNeutral: true,
        note: 'Neutral criterion'
      };
  }
}

/**
 * Scoring weights (F-M3-08). Decided 28/10/2026 — spec-M3.md Clarifications Q1
 * (provisional, VFDA to confirm). Sum = 100. Change them only together with the spec.
 */
export const WEIGHTS = Object.freeze({
  scene_fit: 35,
  season: 15,
  crew: 15,
  logistics: 15,
  permit: 10,
  availability: 10
});

const half = w => Math.round(w / 2); // neutral value for "no data yet" (BR-003)

function asArray(v, fallback = []) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    try { return JSON.parse(v); } catch { return v.split(',').map(x => x.trim()); }
  }
  return fallback;
}

/**
 * Scores location availability as the 6th scoring criterion (BR-010).
 * open = full weight, survey_in_progress = half, paused = 0 (spec-M3.md §9 assumptions).
 */
export function scoreAvailability(status = 'open') {
  const norm = (status || 'open').toLowerCase().trim();
  const w = WEIGHTS.availability;
  switch (norm) {
    case 'open':
      return { score: w, statusLabel: 'open', keepPublished: true, note: 'Location is currently open for scouting and filming' };
    case 'survey_in_progress':
      return { score: half(w), statusLabel: 'survey_in_progress', keepPublished: true, note: 'Survey in progress by another film crew' };
    case 'paused':
      return { score: 0, statusLabel: 'paused', keepPublished: true, note: 'Location is temporarily paused for new productions' };
    default:
      return { score: half(w), statusLabel: norm, keepPublished: true, note: `Availability status: ${norm}` };
  }
}

/**
 * Calculates deterministic total score (0-100) and match reasons for a location (F-M3-08, BR-001, BR-003).
 * Province / region is a filter (F-M3-07), not a scoring criterion: a location outside the
 * requested provinces is marked `excluded` and never shown.
 */
export function scoreLocation(location, query = {}) {
  const parts = {};
  const match_reasons = [];

  // 0. Province filter (F-M3-07)
  const qProvinces = query.provinces
    ? (Array.isArray(query.provinces) ? query.provinces : [query.provinces]).map(Number)
    : [];
  const excluded = qProvinces.length > 0 && !qProvinces.includes(Number(location.province_id));

  // 1. Scene fit (35)
  const locTypes = asArray(location.scene_types);
  const qTypes = query.scene_types ? asArray(query.scene_types, [query.scene_types]) : [];
  if (qTypes.length === 0 || locTypes.length === 0) {
    parts.scene_fit = half(WEIGHTS.scene_fit);
    if (qTypes.length === 0) match_reasons.push('General location match');
  } else {
    const matching = locTypes.filter(t => qTypes.includes(t));
    parts.scene_fit = Math.round((matching.length / qTypes.length) * WEIGHTS.scene_fit);
    if (matching.length > 0) match_reasons.push(`Matches scene types: ${matching.join(', ')}`);
  }

  // 2. Season (15): months to avoid = 0, rainy month = half, otherwise full
  const qMonth = query.shoot_month ? parseInt(query.shoot_month, 10) : null;
  const avoid = asArray(location.months_to_avoid).map(Number);
  const rainy = asArray(location.rainy_months).map(Number);
  if (!qMonth) {
    parts.season = half(WEIGHTS.season);
  } else if (avoid.includes(qMonth)) {
    parts.season = 0;
  } else if (rainy.includes(qMonth)) {
    parts.season = half(WEIGHTS.season);
    match_reasons.push(`Month ${qMonth} is in the rainy season (plan cover)`);
  } else {
    parts.season = WEIGHTS.season;
    match_reasons.push(`Favorable filming conditions in month ${qMonth}`);
  }

  // 3. Crew capacity (15)
  const qCrew = query.crew_size ? String(query.crew_size).toLowerCase() : null;
  const locCrew = location.crew_capacity ? String(location.crew_capacity).toLowerCase() : null;
  const order = { u15: 1, '15_50': 2, o50: 3 };
  if (!qCrew || !locCrew) {
    parts.crew = half(WEIGHTS.crew);
  } else if (order[locCrew] >= order[qCrew]) {
    parts.crew = WEIGHTS.crew;
    match_reasons.push(`Accommodates crew capacity (${locCrew.replace('_', '–')})`);
  } else {
    parts.crew = Math.round(WEIGHTS.crew / 3);
  }

  // 4. Logistics (15): lodging 5, grid power 4, truck access 3, airport distance 3
  const flag = v => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : null);
  const lodging = flag(location.lodging_20km), power = flag(location.grid_power), truck = flag(location.truck_access);
  const airport = location.airport_km === '' || location.airport_km == null ? null : Number(location.airport_km);
  if ([lodging, power, truck, airport].every(v => v === null)) {
    parts.logistics = half(WEIGHTS.logistics);
  } else {
    parts.logistics = (lodging ? 5 : 0) + (power ? 4 : 0) + (truck ? 3 : 0) + (airport === null ? 1 : airport <= 100 ? 3 : airport <= 250 ? 1 : 0);
    if (lodging && power) match_reasons.push('Lodging and grid power nearby');
  }

  // 5. Permit complexity (10)
  const permit = location.permit_complexity ? String(location.permit_complexity).toLowerCase() : null;
  parts.permit = permit === 'low' ? 10 : permit === 'medium' ? 6 : permit === 'high' ? 3 : half(WEIGHTS.permit);
  if (permit === 'low') match_reasons.push('Low permit complexity');

  // 6. Availability (10) (BR-010)
  const avail = scoreAvailability(location.availability);
  parts.availability = avail.score;
  if (avail.statusLabel === 'open') match_reasons.push('Ready and open for production scouting');
  else if (avail.statusLabel === 'survey_in_progress') match_reasons.push('Survey in progress (open with caution)');

  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return {
    location_id: location.location_id,
    score: Math.max(0, Math.min(100, total)),
    parts,
    excluded,
    match_reasons,
    location
  };
}

/**
 * Filters locations by score >= 40 and mandatory match reasons, then ranks descending (BR-002, SC-002).
 */
export function filterAndRankResults(scoredLocations = []) {
  return scoredLocations
    .filter(item => {
      if (item.excluded) return false; // outside the requested provinces (F-M3-07)
      // Must score 40 or higher
      if (item.score < 40) return false;
      // Must have at least one match reason (BR-002, SC-002)
      if (!Array.isArray(item.match_reasons) || item.match_reasons.length === 0) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score);
}
