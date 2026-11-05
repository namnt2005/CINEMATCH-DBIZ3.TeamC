// The SC-33 consultation request (M7 FR-005 as reshaped by BR-005): a topic, the member's time zone and 1–3
// preferred start times — a request VFDA answers by email, not a slot booking. Errors are dictionary keys.
import { isValidZone } from './time.js';

export const TOPICS = Object.freeze(['dossier', 'locations', 'partners', 'provincial_notice', 'general']);
export const MAX_TIMES = 3;
export const MAX_DAYS_AHEAD = 180;
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

function timesError(list, now) {
  if (!Array.isArray(list) || list.length < 1 || list.length > MAX_TIMES) return 'consult.error.times_count';
  const ms = list.map(v => (typeof v === 'string' && ISO_WITH_OFFSET.test(v) ? Date.parse(v) : NaN));
  if (ms.some(Number.isNaN)) return 'consult.error.time_invalid';
  if (ms.some(t => t <= now.getTime())) return 'consult.error.time_past';
  if (ms.some(t => t > now.getTime() + MAX_DAYS_AHEAD * 86400000)) return 'consult.error.time_far';
  if (new Set(ms).size !== ms.length) return 'consult.error.time_duplicate';
  return null;
}

/** { ok, errors, value } — value holds the times in UTC (the member's order) and slot_start = the first. */
export function validateConsultationRequest(body, { now = new Date() } = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  if (!TOPICS.includes(input.topic)) errors.topic = 'consult.error.topic';
  if (!isValidZone(input.timezone)) errors.timezone = 'consult.error.timezone';
  const timeError = timesError(input.preferred_times, now);
  if (timeError) errors.preferred_times = timeError;
  if (Object.keys(errors).length) return { ok: false, errors, value: null };
  const preferred = input.preferred_times.map(v => new Date(v).toISOString());
  return { ok: true, errors: {}, value: { topic: input.topic, timezone: input.timezone, preferred_times: preferred, slot_start: preferred[0] } };
}
