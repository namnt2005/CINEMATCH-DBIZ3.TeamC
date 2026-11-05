// Pure view rules of SC-32 Provincial notices — member and VFDA staff sides, and the SC-16 *I'm interested*
// button (docs/screens/screen-spec-SC-32.md; specs/006-m7-support T015, T029). The database functions enforce
// the same rules; these only decide what the screen offers.

export const PERMIT_NOTE = 'notices.permit_note';
export const REPLY_CHOICES = Object.freeze(['received', 'info_needed', 'cannot_support']);
const EDITORS = ['owner', 'edit'];
const STAFF_TABS = ['submitted', 'changes_requested', 'approved'];

/** SC-32 #5: four steps — drafted, reviewed by VFDA, downloaded and sent by the crew, province replied. */
export function steps(n) {
  return [
    { key: 'drafted', done: Boolean(n.drafted_at), date: n.drafted_at ?? null },
    { key: 'reviewed', done: n.review_status === 'approved', date: null },
    { key: 'sent', done: Boolean(n.sent_at), date: n.sent_at ?? null },
    { key: 'replied', done: Boolean(n.responded_at), date: n.responded_at ?? null }
  ];
}

/** The one action a card offers for its state and the viewer's permission (R1, D7, US-1 Scenario 2). */
export function cardAction(n, permission, { archived = false } = {}) {
  const editor = EDITORS.includes(permission) && !archived;
  if (n.review_status === 'approved') {
    if (n.sent_at && editor) return { kind: 'reply' };
    return { kind: 'download', record: editor && !n.sent_at };
  }
  if (!editor) return { kind: 'none' };
  if (n.review_status === 'submitted') return { kind: 'waiting' };
  const blocked = (n.missing || []).includes('shoot_date');
  const base = { disabled: blocked, reason: blocked ? 'notices.missing.shoot_date' : null };
  if (n.review_status === 'changes_requested') return { kind: 'resubmit', ...base, note: n.review_note };
  return { kind: 'submit', ...base };
}

/** SC-32 #6: the reply status always has text. */
export const replyStatus = (n) => (n.response ? `notices.reply.${n.response}` : 'notices.reply.waiting');

const vnDate = (iso) => {
  if (!iso) return null;
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
};

/** SC-32 #6–#7: status, date in Vietnam time, and the note as entered (BR-003). */
export const replyLine = (n) => ({ status: replyStatus(n), date: vnDate(n.responded_at), note: n.note ?? null });

/** R6: staff tabs, Submitted first. */
export const staffTabs = (status) => STAFF_TABS.map(s => ({ status: s, active: s === (status || 'submitted') }));

/** R10: the SC-16 button — sign in, choose one of the caller's owner / edit projects, or nothing to offer. */
export function interestChoice({ signedIn, projects }) {
  if (!signedIn) return { kind: 'signin' };
  const editable = (projects || []).filter(p => EDITORS.includes(p.permission) && p.stage !== 'archived');
  return editable.length ? { kind: 'choose', projects: editable } : { kind: 'none' };
}

export const formatDate = vnDate;
