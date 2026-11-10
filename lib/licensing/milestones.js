// SC-29 milestones without a target date (research R5): their current state from M4 and M5 data.
export function milestones({ confirmedAt, paragraphs }) {
  const total = paragraphs.length;
  const reviewed = paragraphs.filter(p => p.status === 'reviewed');
  const doneAt = reviewed.map(p => p.reviewed_at).filter(Boolean).sort().pop() ?? null;
  return [
    confirmedAt ? { key: 'partner_confirmed', state: 'done', date: String(confirmedAt).slice(0, 10) } : { key: 'partner_confirmed', state: 'open' },
    total > 0 && reviewed.length === total ? { key: 'vietnamese_done', state: 'done', date: doneAt ? String(doneAt).slice(0, 10) : null } : { key: 'vietnamese_done', state: 'open' }
  ];
}
