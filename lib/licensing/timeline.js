// The licensing timeline (M2 FR-017, FR-018, BR-006, Clarifications Q1, decisions D1, D8): the buffer counts calendar
// days, the two 20-day periods of Article 13 clause 4 count working days. One function for SC-12, SC-27 and SC-29
// (SR-173). Field names never say "safe" (D8).
import { workingDaysBefore, workingDaysAfter, addCalendarDays } from '../dates/working-days.js';

const dayDiff = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);

/** Holiday ranges (name, start, end, expected) from a holidaySet() map, contiguous days of one name grouped. */
function ranges(holidays) {
  const days = [...holidays.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const out = [];
  for (const [d, h] of days) {
    const last = out[out.length - 1];
    if (last && last.name === h.name && addCalendarDays(last.end_date, 1) === d) last.end_date = d;
    else out.push({ name: h.name, start_date: d, end_date: d, expected: Boolean(h.expected) });
  }
  return out;
}

export function licensingTimeline(project, holidays = new Map(), today, { submit } = {}) {
  const base = { applies: project.segment !== 'C', shoot_date: project.shoot_date || null, buffer_days: Number(project.buffer_days ?? 7), today };
  if (!base.applies || !base.shoot_date) {
    return { ...base, buffer_start: null, latest: null, recommended: null, days_to_recommended: null, days_to_latest: null,
      recommended_passed: false, smooth: null, resubmission: null, holidays: [] };
  }
  const bufferStart = addCalendarDays(base.shoot_date, -base.buffer_days);
  const latest = workingDaysBefore(bufferStart, 20, holidays);
  const recommended = workingDaysBefore(latest, 20, holidays);
  const from = submit || recommended;
  const resultBy = workingDaysAfter(from, 20, holidays);
  const resultByWorst = workingDaysAfter(from, 40, holidays);
  return {
    ...base, buffer_start: bufferStart, latest, recommended,
    days_to_recommended: dayDiff(recommended, today), days_to_latest: dayDiff(latest, today), recommended_passed: recommended < today,
    smooth: { submit: from, result_by: resultBy }, resubmission: { submit: from, result_by_worst: resultByWorst },
    holidays: ranges(holidays).filter(h => h.end_date >= from && h.start_date <= resultByWorst)
  };
}
