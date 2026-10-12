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
 * Scores location availability as the 6th scoring criterion (BR-010).
 */
export function scoreAvailability(status = 'open') {
  const norm = (status || 'open').toLowerCase().trim();

  switch (norm) {
    case 'open':
      return {
        score: 10,
        statusLabel: 'open',
        keepPublished: true,
        note: 'Location is currently open for scouting and filming'
      };
    case 'survey_in_progress':
      return {
        score: 6,
        statusLabel: 'survey_in_progress',
        keepPublished: true,
        note: 'Survey in progress by another film crew'
      };
    case 'paused':
      return {
        score: 2,
        statusLabel: 'paused',
        keepPublished: true,
        note: 'Location is temporarily paused for new productions'
      };
    default:
      return {
        score: 5,
        statusLabel: norm,
        keepPublished: true,
        note: `Availability status: ${norm}`
      };
  }
}

/**
 * Calculates deterministic total score (0-100) and match reasons for a location (F-M3-08, BR-001).
 */
export function scoreLocation(location, query = {}) {
  let totalScore = 0;
  const match_reasons = [];

  // 1. Scene Types (Weight: 35 points)
  let locTypes = [];
  if (Array.isArray(location.scene_types)) {
    locTypes = location.scene_types;
  } else if (typeof location.scene_types === 'string') {
    try {
      locTypes = JSON.parse(location.scene_types);
    } catch {
      locTypes = location.scene_types.split(',').map(s => s.trim());
    }
  }

  const qTypes = query.scene_types
    ? (Array.isArray(query.scene_types) ? query.scene_types : [query.scene_types])
    : [];

  if (qTypes.length > 0) {
    const matchingTypes = locTypes.filter(t => qTypes.includes(t));
    if (matchingTypes.length > 0) {
      const ratio = matchingTypes.length / qTypes.length;
      const pts = Math.round(ratio * 35);
      totalScore += pts;
      match_reasons.push(`Matches scene types: ${matchingTypes.join(', ')}`);
    }
  } else {
    // If no scene types specified in search, award neutral baseline points
    totalScore += 25;
    match_reasons.push('General location match');
  }

  // 2. Province / Region Match (Weight: 20 points)
  const qProvinces = query.provinces
    ? (Array.isArray(query.provinces) ? query.provinces : [query.provinces]).map(Number)
    : [];

  if (qProvinces.length > 0) {
    if (qProvinces.includes(Number(location.province_id))) {
      totalScore += 20;
      match_reasons.push('Located in requested province');
    }
  } else {
    totalScore += 15;
  }

  // 3. Crew Capacity Match (Weight: 15 points)
  const qCrew = query.crew_size ? query.crew_size.toLowerCase() : null;
  const locCrew = location.crew_capacity ? location.crew_capacity.toLowerCase() : null;

  if (qCrew && locCrew) {
    if (locCrew === qCrew || locCrew === 'o50' || (locCrew === '15_50' && qCrew === 'u15')) {
      totalScore += 15;
      match_reasons.push(`Accommodates crew capacity (${locCrew.replace('_', '–')})`);
    } else {
      totalScore += 5;
    }
  } else {
    totalScore += 10;
  }

  // 4. Shooting Month / Weather (Weight: 15 points)
  let monthsAvoid = [];
  if (Array.isArray(location.months_to_avoid)) {
    monthsAvoid = location.months_to_avoid;
  } else if (typeof location.months_to_avoid === 'string') {
    try {
      monthsAvoid = JSON.parse(location.months_to_avoid);
    } catch {
      monthsAvoid = [];
    }
  }

  const qMonth = query.shoot_month ? parseInt(query.shoot_month, 10) : null;
  if (qMonth) {
    if (monthsAvoid.includes(qMonth)) {
      totalScore += 0;
    } else {
      totalScore += 15;
      match_reasons.push(`Favorable filming conditions in month ${qMonth}`);
    }
  } else {
    totalScore += 10;
  }

  // 5. Permit Complexity & Logistics (Weight: 5 points)
  const permit = (location.permit_complexity || 'medium').toLowerCase();
  if (permit === 'low') {
    totalScore += 5;
    match_reasons.push('Low permit complexity');
  } else if (permit === 'medium') {
    totalScore += 4;
  } else {
    totalScore += 2;
  }

  // 6. Availability Criterion (Weight: 10 points) (BR-010)
  const avail = scoreAvailability(location.availability);
  totalScore += avail.score;
  if (avail.statusLabel === 'open') {
    match_reasons.push('Ready and open for production scouting');
  } else if (avail.statusLabel === 'survey_in_progress') {
    match_reasons.push('Survey in progress (open with caution)');
  }

  // Ensure score is clamped 0 to 100
  totalScore = Math.max(0, Math.min(100, totalScore));

  return {
    location_id: location.location_id,
    score: totalScore,
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
      // Must score 40 or higher
      if (item.score < 40) return false;
      // Must have at least one match reason (BR-002, SC-002)
      if (!Array.isArray(item.match_reasons) || item.match_reasons.length === 0) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score);
}
