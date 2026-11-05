// Notice input checks (M7 FR-002, FR-003, BR-003; specs/006-m7-support research R6, R7). Pure: used by the API
// routes and by the SC-32 forms. Errors are dictionary keys (lib/i18n).
import { RECIPIENTS } from './letter.js';

export const DECISIONS = Object.freeze(['approve', 'request_changes']);
export const RESPONSES = Object.freeze(['received', 'info_needed', 'cannot_support']);
export const REVIEW_NOTE_MAX = 1000;
export const REPLY_NOTE_MAX = 2000;

export function validateRecipient(value) {
  return RECIPIENTS.includes(value) ? { ok: true, error: null, value } : { ok: false, error: 'notices.error.recipient_invalid', value: null };
}

/** R6: approve, or request changes with a note of 1–1000 characters. */
export function validateReview(input) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = {};
  if (!DECISIONS.includes(body.decision)) errors.decision = 'notices.error.decision_invalid';
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (body.decision === 'request_changes') {
    if (!note) errors.note = 'notices.error.note_required';
    else if (note.length > REVIEW_NOTE_MAX) errors.note = 'notices.error.note_long';
  }
  return { ok: Object.keys(errors).length === 0, errors, value: { decision: body.decision, note: note || null } };
}

/** BR-003: one of three final values; the note is kept exactly as entered. */
export function validateReply(input) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = {};
  if (!RESPONSES.includes(body.response)) errors.response = 'notices.error.response_invalid';
  const note = typeof body.note === 'string' && body.note.length ? body.note : null;
  if (note && note.length > REPLY_NOTE_MAX) errors.note = 'notices.error.reply_note_long';
  return { ok: Object.keys(errors).length === 0, errors, value: { response: body.response, note } };
}
