// SC-33 view rules (M7 FR-005, BR-005): a request form — topic, time zone, 1–3 preferred times — never a calendar.
// Pure functions shared by the form and its tests (tests/unit/consultation-view.test.js).
import { validateConsultationRequest, TOPICS, MAX_TIMES } from '../../lib/consultations/input.js';
import { zonedToUtc, formatInZone, isValidZone, HANOI } from '../../lib/consultations/time.js';

export { TOPICS, MAX_TIMES, zonedToUtc, formatInZone, isValidZone };

/** #4: the browser's zone, or Hanoi when the browser gives none Intl knows. */
export function defaultZone() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidZone(zone) ? zone : HANOI;
}

/** The request body from the form: empty extra time fields are dropped, the others read in the chosen zone. */
export function toRequest({ topic, timezone, times }) {
  const filled = (times || []).filter(Boolean);
  return { topic, timezone, preferred_times: filled.map(t => zonedToUtc(t, timezone) ?? t) };
}

/** #9: Send request needs a topic, a valid zone and at least one valid time (future, ≤ 180 days, no duplicates). */
export const canSend = (form, now = new Date()) => validateConsultationRequest(toRequest(form), { now }).ok;

/** #5: + Add another time while fewer than three fields are shown. */
export const canAddTime = (times) => (times || []).length < MAX_TIMES;

/** #7: the Hanoi time of a field's value, or null while the field is empty. */
export function hanoiTime(local, zone) {
  const utc = zonedToUtc(local, zone);
  return utc ? formatInZone(utc, HANOI) : null;
}

/** #8: a field's value as shown in the summary — in the member's zone and in Hanoi time — or null while empty. */
export function timePair(local, zone) {
  const utc = zonedToUtc(local, zone);
  return utc ? { local: formatInZone(utc, zone), zone, hanoi: formatInZone(utc, HANOI) } : null;
}

/** #10: the status line of one request. */
export const requestStatus = (r) => (r?.booking_status ? `consult.status.${r.booking_status}` : 'consult.status.waiting');
