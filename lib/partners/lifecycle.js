// The collaboration request state machine (M4 BR-005, FR-014; specs/007-m4-partners data-model §4, D7).
// The database functions enforce the same rules; this twin lets the screens and node:sqlite agree with them.
export const OPEN_STATUSES = Object.freeze(['pending', 'under_review', 'info_requested', 'accepted']);
export const FINAL_STATUSES = Object.freeze(['declined', 'withdrawn', 'confirmed']);
export const RESPONSES = Object.freeze(['under_review', 'info_requested', 'accepted', 'declined']);
// SC-25 #5, SR-141 (five steps since 06/11/2026): Sent → Viewed → Accepted → NDA agreed → Confirmed
export const STEPS = Object.freeze(['sent', 'viewed', 'accepted', 'nda', 'confirmed']);
const ANSWERABLE = ['pending', 'under_review', 'info_requested'];

export const isFinal = (status) => FINAL_STATUSES.includes(status);

/**
 * One move: `side` is 'producer' (owner / edit of the project) or 'partner' (a user of the organisation).
 * Returns { to } or { error } with the code the API answers.
 */
export function transition(from, action, { side, decision, ndaAccepted = false, producerNda = false } = {}) {
  if (isFinal(from)) return { error: 'INVALID_STATE' };
  if (action === 'respond') {
    if (side !== 'partner') return { error: 'FORBIDDEN' };
    if (!ANSWERABLE.includes(from)) return { error: 'INVALID_STATE' };
    if (!RESPONSES.includes(decision)) return { error: 'VALIDATION_ERROR' };
    if (decision === 'accepted' && !ndaAccepted) return { error: 'NDA_REQUIRED' };
    return { to: decision };
  }
  if (action === 'confirm') {
    if (side !== 'producer') return { error: 'FORBIDDEN' };
    if (from !== 'accepted') return { error: 'INVALID_STATE' };
    if (!producerNda) return { error: 'NDA_REQUIRED' };
    return { to: 'confirmed' };
  }
  if (action === 'withdraw') {
    if (side !== 'producer') return { error: 'FORBIDDEN' };
    if (!OPEN_STATUSES.includes(from)) return { error: 'INVALID_STATE' };
    return { to: 'withdrawn' };
  }
  return { error: 'VALIDATION_ERROR' };
}

/** The SC-25 step (1–5) of a status, or null for an end state. */
export function step(status, { producerNda = false } = {}) {
  if (status === 'pending') return 1;
  if (status === 'under_review' || status === 'info_requested') return 2;
  if (status === 'accepted') return producerNda ? 4 : 3;
  if (status === 'confirmed') return 5;
  return null;
}

/** What the caller's side may do now (SC-25 buttons); the server checks every action again. */
export function can(status, { side, producerNda = false } = {}) {
  const producer = side === 'producer';
  const partner = side === 'partner';
  return {
    respond: partner && ANSWERABLE.includes(status),
    accept_nda: producer && status === 'accepted' && !producerNda,
    confirm: producer && status === 'accepted' && producerNda,
    withdraw: producer && OPEN_STATUSES.includes(status),
    message: producer || partner
  };
}
