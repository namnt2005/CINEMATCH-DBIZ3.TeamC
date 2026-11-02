import { getPublishedLocations } from './locations.js';
import { rankLocations } from '../search-core.js';

export async function searchLocations(criteria = {}) {
  return rankLocations(await getPublishedLocations(), criteria);
}
