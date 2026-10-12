/**
 * URL state synchronization helper for multi-criteria location filters (F-M3-07).
 * Encodes and decodes filter parameters to and from URL search strings.
 */

/**
 * Serializes filter state object into a URL search query string.
 * 
 * @param {Object} filterState - State object
 * @returns {string} URL query string (e.g. "?scene_types=karst,river&crew_size=15_50...")
 */
export function serializeFilterState(filterState = {}) {
  const params = new URLSearchParams();

  if (Array.isArray(filterState.scene_types) && filterState.scene_types.length > 0) {
    params.set('scene_types', filterState.scene_types.join(','));
  }

  if (Array.isArray(filterState.provinces) && filterState.provinces.length > 0) {
    params.set('provinces', filterState.provinces.join(','));
  }

  if (filterState.region) {
    params.set('region', filterState.region);
  }

  if (filterState.crew_size) {
    params.set('crew_size', filterState.crew_size);
  }

  if (filterState.shoot_month) {
    params.set('shoot_month', String(filterState.shoot_month));
  }

  if (filterState.q) {
    params.set('q', filterState.q);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Deserializes URL search query string into typed filter state object.
 * 
 * @param {string} searchString - Raw query string (e.g. window.location.search or custom string)
 * @returns {Object} Parsed typed filter object
 */
export function deserializeFilterState(searchString = '') {
  const cleanSearch = searchString.startsWith('?') ? searchString.slice(1) : searchString;
  const params = new URLSearchParams(cleanSearch);
  const state = {};

  const sceneTypes = params.get('scene_types');
  if (sceneTypes) {
    state.scene_types = sceneTypes.split(',').map(s => s.trim()).filter(Boolean);
  }

  const provinces = params.get('provinces');
  if (provinces) {
    state.provinces = provinces
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(n => !isNaN(n));
  }

  const region = params.get('region');
  if (region) {
    state.region = region;
  }

  const crew = params.get('crew_size');
  if (crew) {
    state.crew_size = crew;
  }

  const month = params.get('shoot_month');
  if (month) {
    const parsed = parseInt(month, 10);
    if (!isNaN(parsed)) {
      state.shoot_month = parsed;
    }
  }

  const q = params.get('q');
  if (q) {
    state.q = q;
  }

  return state;
}
