import { getSceneCatalog } from '../catalog/validator.js';
import { query } from '../db/client.js';

/*
 * Input checks for SC-35 (FR-002, FR-004), from data/schema/schema-M3.sql and
 * specs/002-m3-publish/data-model.md §1. Every error is returned at once as field → message;
 * the database checks stay as the last line of defence.
 */

const NIGHT_SHOOTING = ['yes', 'no', 'ask']; // ck_location_night_shooting_allowed
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isMissing = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

function provinceIds() {
  return new Set(query('SELECT province_id FROM province').map(r => Number(r.province_id)));
}

function text(errors, value, field, { required, max, label }) {
  if (isMissing(value)) {
    if (required) errors[field] = `${label} is required.`;
    return null;
  }
  if (typeof value !== 'string') {
    errors[field] = `${label} must be text.`;
    return null;
  }
  const trimmed = value.trim();
  if (max && trimmed.length > max) errors[field] = `${label} must be at most ${max} characters.`;
  return trimmed;
}

function number(errors, value, field, { label, min, max, integer }) {
  if (isMissing(value)) {
    errors[field] = `${label} is required.`;
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n) || (integer && !Number.isInteger(n))) {
    errors[field] = `${label} must be ${integer ? 'a whole number' : 'a number'}.`;
    return null;
  }
  if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
    errors[field] = `${label} must be between ${min} and ${max}.`;
  }
  return n;
}

function oneOf(errors, value, field, { label, values, required }) {
  if (isMissing(value)) {
    if (required) errors[field] = `${label} is required.`;
    return null;
  }
  if (!values.includes(value)) errors[field] = `${label} must be one of: ${values.join(', ')}.`;
  return value;
}

function bool(errors, value, field, label) {
  if (value !== true && value !== false) errors[field] = `${label} must be yes or no.`;
  return value === true;
}

// null = no data yet; [] = none recorded (Clarifications Q3, agreed 30/10/2026)
function months(errors, value, field, label) {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || !value.every(m => Number.isInteger(m) && m >= 1 && m <= 12)) {
    errors[field] = `${label} must be months between 1 and 12.`;
    return null;
  }
  return [...new Set(value)].sort((a, b) => a - b);
}

const FIELDS = {
  name_vi: (e, v) => text(e, v, 'name_vi', { required: true, max: 200, label: 'Vietnamese name' }),
  name_en: (e, v) => text(e, v, 'name_en', { required: true, max: 200, label: 'English name' }),
  province_id: (e, v) => {
    const id = number(e, v, 'province_id', { label: 'Province', integer: true });
    if (id !== null && !e.province_id && !provinceIds().has(id)) {
      e.province_id = 'Province must be one of the 34 provincial-level units.';
    }
    return id;
  },
  district: (e, v) => text(e, v, 'district', { required: false, max: 120, label: 'District' }),
  lat: (e, v) => number(e, v, 'lat', { label: 'Latitude', min: 8, max: 24 }),
  lng: (e, v) => number(e, v, 'lng', { label: 'Longitude', min: 102, max: 110 }),
  airport_km: (e, v) => (isMissing(v) ? null : number(e, v, 'airport_km', { label: 'Distance to the airport', integer: true })),
  scene_types: (e, v) => {
    const allowed = getSceneCatalog().scene_types;
    if (!Array.isArray(v) || v.length === 0) {
      e.scene_types = 'Choose at least one scene type.';
      return [];
    }
    const unknown = v.filter(t => !allowed.includes(t));
    if (unknown.length > 0) e.scene_types = `Unknown scene type: ${unknown.join(', ')}.`;
    return [...new Set(v)];
  },
  desc_vi: (e, v) => text(e, v, 'desc_vi', { required: true, label: 'Vietnamese description' }),
  desc_en: (e, v) => text(e, v, 'desc_en', { required: true, label: 'English description' }),
  crew_capacity: (e, v) => oneOf(e, v, 'crew_capacity', { label: 'Crew capacity', values: getSceneCatalog().crew_capacity, required: true }),
  lodging_20km: (e, v) => bool(e, v, 'lodging_20km', 'Lodging within 20 km'),
  grid_power: (e, v) => bool(e, v, 'grid_power', 'Grid power'),
  truck_access: (e, v) => bool(e, v, 'truck_access', 'Truck access'),
  months_to_avoid: (e, v) => months(e, v, 'months_to_avoid', 'Months to avoid'),
  permit_complexity: (e, v) => oneOf(e, v, 'permit_complexity', { label: 'Permit complexity', values: getSceneCatalog().permit_complexity, required: true }),
  restriction_note: (e, v) => text(e, v, 'restriction_note', { required: false, label: 'Restriction note' }),
  availability: (e, v) => oneOf(e, v, 'availability', { label: 'Availability', values: getSceneCatalog().availability, required: true }),
  night_shooting_allowed: (e, v) => oneOf(e, v, 'night_shooting_allowed', { label: 'Night shooting', values: NIGHT_SHOOTING, required: false }),
  rainy_months: (e, v) => months(e, v, 'rainy_months', 'Rainy months')
};

/** The 20 fields of the data-entry template (FR-002), in SC-35 order. */
export const LOCATION_FIELDS = Object.keys(FIELDS);

/**
 * Validates the 20 location fields.
 * @param {object} input request body
 * @param {{ partial?: boolean }} [options] partial: check only the fields present (PUT)
 * @returns {{ ok: boolean, errors: Record<string, string>, value: object }} value holds the normalised fields
 */
export function validateLocationInput(input, { partial = false } = {}) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = {};
  const value = {};
  for (const field of LOCATION_FIELDS) {
    if (partial && !(field in body)) continue;
    value[field] = FIELDS[field](errors, body[field]);
  }
  return { ok: Object.keys(errors).length === 0, errors, value };
}

/** Validates the local authority contact (FR-004). */
export function validateContactInput(input) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = {};
  const value = {
    authority_name: text(errors, body.authority_name, 'authority_name', { required: true, max: 200, label: 'Authority office' }),
    contact_name: text(errors, body.contact_name, 'contact_name', { required: true, max: 120, label: 'Contact person' }),
    contact_phone: text(errors, body.contact_phone, 'contact_phone', { required: true, max: 20, label: 'Phone' }),
    contact_email: text(errors, body.contact_email, 'contact_email', { required: false, max: 254, label: 'E-mail' })
  };
  if (value.contact_email && !errors.contact_email && !EMAIL.test(value.contact_email)) {
    errors.contact_email = 'E-mail is not a valid address.';
  }
  return { ok: Object.keys(errors).length === 0, errors, value };
}
