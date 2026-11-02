import { getPublishedLocations } from './locations.js';
import { rankLocations } from '../search-core.js';

export { removeDiacritics, resolveProvinceInput, buildSearchQueryFilter } from '../search-core.js';

/**
 * Executes multi-criteria location discovery search with deterministic scoring and ranking.
 */
export function searchLocations(criteria = {}) {
  return rankLocations(getPublishedLocations(), criteria);
}
