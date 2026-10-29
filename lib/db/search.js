import { getPublishedLocations } from './locations.js';
import { scoreLocation, filterAndRankResults } from '../scoring/engine.js';
import { getSceneCatalog } from '../catalog/validator.js';

/**
 * Removes Vietnamese diacritics and normalizes text for search (F-M3-06).
 */
export function removeDiacritics(str = '') {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Maps pre-2025 province names to modern reorganized 34 provincial units (BR-006).
 */
export function resolveProvinceInput(input) {
  if (!input || typeof input !== 'string') {
    return { name: input, isMapped: false };
  }

  const catalog = getSceneCatalog();
  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase();

  // Check merger dictionary in catalog
  if (catalog.province_mergers_post_2025) {
    for (const [oldName, modernName] of Object.entries(catalog.province_mergers_post_2025)) {
      if (oldName.toLowerCase() === normalized) {
        return {
          name: modernName,
          isMapped: true,
          mappingNote: `Pre-2025 province "${trimmed}" was merged into ${modernName} (BR-006).`
        };
      }
    }
  }

  return {
    name: trimmed,
    isMapped: false
  };
}

/**
 * Builds standard query filter enforcing published status and excluding unpublished (BR-008).
 */
export function buildSearchQueryFilter(options = {}) {
  const whereClauses = [
    "intake_status = 'published'",
    "(published = 'true' OR published = 1)"
  ];

  return {
    whereClause: `WHERE ${whereClauses.join(' AND ')}`,
    excludeAwaitingContact: true,
    excludeUnpublished: true
  };
}

/**
 * Executes multi-criteria location discovery search with deterministic scoring and ranking.
 */
export function searchLocations(criteria = {}) {
  const publishedLocations = getPublishedLocations();

  // 1. Text filter (if q is provided, unaccent match F-M3-06)
  let candidates = publishedLocations;
  if (criteria.q && criteria.q.trim() !== '') {
    const qNorm = removeDiacritics(criteria.q);
    candidates = candidates.filter(loc => {
      const nameVi = removeDiacritics(loc.name_vi);
      const nameEn = removeDiacritics(loc.name_en);
      const descVi = removeDiacritics(loc.desc_vi);
      const descEn = removeDiacritics(loc.desc_en);
      const slug = removeDiacritics(loc.slug);
      const provName = removeDiacritics(loc.province_name);

      return (
        nameVi.includes(qNorm) ||
        nameEn.includes(qNorm) ||
        descVi.includes(qNorm) ||
        descEn.includes(qNorm) ||
        slug.includes(qNorm) ||
        provName.includes(qNorm)
      );
    });
  }

  // 2. Score each candidate deterministically (F-M3-08, BR-001)
  const scored = candidates.map(loc => scoreLocation(loc, criteria));

  // 3. Filter score >= 40 and >= 1 match reason, sort descending (BR-002, SC-002)
  return filterAndRankResults(scored);
}
