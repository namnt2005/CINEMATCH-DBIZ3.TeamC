import fs from 'node:fs';
import path from 'node:path';

// Load scene catalog
let catalogCache = null;

export function getSceneCatalog() {
  if (catalogCache) return catalogCache;
  const catalogPath = path.resolve(process.cwd(), 'config', 'scene-catalog.json');
  const raw = fs.readFileSync(catalogPath, 'utf8');
  catalogCache = JSON.parse(raw);
  return catalogCache;
}

/**
 * Validates extracted or submitted attributes against catalog taxonomy and maps synonyms (F-M3-12).
 * 
 * @param {Object} attributes - Raw extracted attributes
 * @returns {{ valid_attributes: Object, mapped_explanations: Array, rejected: Array }}
 */
export function validateAndMapAttributes(attributes = {}) {
  const catalog = getSceneCatalog();
  const valid_attributes = {};
  const mapped_explanations = [];
  const rejected = [];

  const rawSceneTypes = Array.isArray(attributes.scene_types)
    ? attributes.scene_types
    : attributes.scene_types
      ? [attributes.scene_types]
      : [];

  const validSceneTypes = new Set();

  for (const rawType of rawSceneTypes) {
    if (!rawType || typeof rawType !== 'string') continue;
    const normalized = rawType.toLowerCase().trim();

    // 1. Direct match in catalog scene_types
    if (catalog.scene_types.includes(normalized)) {
      validSceneTypes.add(normalized);
    }
    // 2. Synonym match
    else if (catalog.synonyms && catalog.synonyms[normalized]) {
      const mapped = catalog.synonyms[normalized];
      validSceneTypes.add(mapped);
      mapped_explanations.push({
        original: rawType,
        mapped
      });
    }
    // 3. Rejected / Unknown
    else {
      rejected.push(rawType);
    }
  }

  valid_attributes.scene_types = Array.from(validSceneTypes);

  // Every other dropped value is reported too, never silently removed (SC-15 SR-093)

  // Validate crew capacity / size if present
  if (attributes.crew_size || attributes.crew_capacity) {
    const rawCrew = attributes.crew_size || attributes.crew_capacity;
    const crew = String(rawCrew).toLowerCase().trim();
    if (catalog.crew_capacity.includes(crew)) {
      valid_attributes.crew_size = crew;
    } else {
      rejected.push(rawCrew);
    }
  }

  // Validate era if present
  if (attributes.era) {
    const era = String(attributes.era).toLowerCase().trim();
    if (catalog.era.includes(era)) {
      valid_attributes.era = era;
    } else {
      rejected.push(attributes.era);
    }
  }

  // Validate shoot month if present (1-12)
  if (attributes.shoot_month) {
    const m = parseInt(attributes.shoot_month, 10);
    if (!isNaN(m) && m >= 1 && m <= 12) {
      valid_attributes.shoot_month = m;
    } else {
      rejected.push(attributes.shoot_month);
    }
  }

  // Validate time of day
  if (attributes.time_of_day) {
    const todList = Array.isArray(attributes.time_of_day) ? attributes.time_of_day : [attributes.time_of_day];
    valid_attributes.time_of_day = [];
    for (const t of todList) {
      const tod = String(t).toLowerCase().trim();
      if (catalog.time_of_day.includes(tod)) valid_attributes.time_of_day.push(tod);
      else rejected.push(t);
    }
  }

  return {
    valid_attributes,
    mapped_explanations,
    rejected
  };
}
