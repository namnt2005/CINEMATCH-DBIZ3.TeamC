// Working days (M2 BR-006, Clarifications Q1; SC-29 SR-173): Saturdays, Sundays and every date of public_holiday are not
// working days. Pure functions on YYYY-MM-DD strings (no time zone), shared by M2 now and M0, M5 later.

const shift = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Map date → { name, expected } for every day of every holiday range (rows of public_holiday). */
export function holidaySet(rows = []) {
  const out = new Map();
  for (const h of rows) {
    const expected = h.is_expected === true || h.is_expected === 'true' || h.is_expected === 1;
    for (let d = h.start_date; d <= h.end_date; d = shift(d, 1)) out.set(d, { name: h.name, expected });
  }
  return out;
}

export function isWorkingDay(date, holidays = new Map()) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6 && !holidays.has(date);
}

/** Steps back from `date` (not counted) and returns the day on which the n-th working day is reached. */
export function workingDaysBefore(date, n, holidays = new Map()) {
  let d = date;
  let left = n;
  while (left > 0) {
    d = shift(d, -1);
    if (isWorkingDay(d, holidays)) left--;
  }
  return d;
}

/** The n-th working day counting `date` as day 1 when it is a working day (otherwise from the next working day). */
export function workingDaysAfter(date, n, holidays = new Map()) {
  let d = date;
  let count = 0;
  for (;;) {
    if (isWorkingDay(d, holidays) && ++count === n) return d;
    d = shift(d, 1);
  }
}

export const addCalendarDays = shift;
