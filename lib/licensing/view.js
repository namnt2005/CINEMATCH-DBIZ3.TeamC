// SC-29, the SC-12 deadline strip and the SC-27 deadline line (SR-171..SR-175; decisions D8, D13): all from one
// licensingTimeline() result, so the three screens show the same dates (SC-005).
const dayDiff = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);

export function recommendedCard(t) {
  if (!t?.recommended) return null;
  return { titleKey: 'timeline.recommended.title', date: t.recommended, days: Math.abs(t.days_to_recommended), passed: t.recommended_passed,
    lineKey: t.recommended_passed ? 'timeline.recommended.passed' : 'timeline.recommended.days' };
}

/** The table alternative of the axis (SC-29 §8): milestone – date – days remaining, in date order. */
export function timelineRows(t) {
  if (!t?.recommended) return [];
  const rows = [
    ...(t.milestones || []).filter(m => m.date).map(m => ({ key: m.key, date: String(m.date).slice(0, 10) })),
    { key: 'recommended', date: t.recommended }, { key: 'latest', date: t.latest },
    { key: 'buffer_start', date: t.buffer_start }, { key: 'shoot', date: t.shoot_date }
  ];
  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map(r => ({ ...r, days: dayDiff(r.date, t.today) }));
}

export const milestoneStates = (t) => (t?.milestones || []).map(m => ({ key: m.key, stateKey: `timeline.state.${m.state}`, date: m.date ? String(m.date).slice(0, 10) : null }));

export const holidayBands = (t) => (t?.holidays || []).map(h => ({ name: h.name, from: h.start_date, to: h.end_date, expectedKey: h.expected ? 'timeline.holiday.expected' : null }));

/** SC-12 #10 (D13). */
export function stripView(t) {
  if (!t?.applies || !t.recommended) return null;
  return { date: t.recommended, days: Math.abs(t.days_to_recommended), passed: t.recommended_passed,
    key: t.recommended_passed ? 'dashboard.deadline.passed' : 'dashboard.deadline.recommended' };
}

/** SC-27 deadline line (D13). */
export const dossierLine = (t) => (t?.applies && t.recommended ? { recommended: t.recommended, latest: t.latest } : null);

export const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
