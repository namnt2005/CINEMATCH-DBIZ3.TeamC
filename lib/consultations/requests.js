// The member's list of consultation requests (SC-33 #10), the same for both data sources.
const parseTimes = (v) => (Array.isArray(v) ? v : JSON.parse(v || '[]'));

/** One request as the API answers it. */
export const shapeRequest = (r) => ({
  booking_id: r.booking_id, topic: r.topic, timezone: r.timezone, preferred_times: parseTimes(r.preferred_times),
  slot_start: r.slot_start, booking_status: r.booking_status || null
});

/** Upcoming first (nearest first), then past ones (latest first), by the first preferred time. */
export function sortRequests(list, now = Date.now()) {
  const at = (r) => Date.parse(r.slot_start);
  const upcoming = list.filter(r => at(r) > now).sort((a, b) => at(a) - at(b));
  const past = list.filter(r => !(at(r) > now)).sort((a, b) => at(b) - at(a));
  return [...upcoming, ...past];
}
