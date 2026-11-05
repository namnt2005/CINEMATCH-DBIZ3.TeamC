// Pure view helpers for SC-02 (docs/screens/screen-spec-SC-02.md), tested with node --test. No text here:
// they return dictionary keys or call the page's translator (SYS FR-006).

export const EMPTY_ANSWERS = Object.freeze({ q1_shoot_in_vn: null, q2_release: null, q3_producer: null, q4_needs: null });
export const STORAGE_KEY = 'cinematch.router.answers';
const LETTERS = ['A', 'B', 'C'];

/** SC-02 #2: answered questions out of 4; question 4 counts once answered, even with nothing ticked. */
export function progress(a) {
  return [a.q1_shoot_in_vn, a.q2_release, a.q3_producer, a.q4_needs].filter(v => v !== null && v !== undefined).length;
}

/** SC-02 Default: one question at a time; questions 2 and 3 only after Yes. */
export function visibleQuestions(a) {
  if (a.q1_shoot_in_vn === null || a.q1_shoot_in_vn === undefined) return [1];
  if (a.q1_shoot_in_vn === false) return [1, 4];
  if (!a.q2_release) return [1, 2];
  if (!a.q3_producer) return [1, 2, 3];
  return [1, 2, 3, 4];
}

/** SC-02 #7: changing question 1 to No clears questions 2 and 3, which are no longer asked. */
export function setAnswer(a, field, value) {
  const next = { ...a, [field]: value };
  if (field === 'q1_shoot_in_vn' && value === false) { next.q2_release = null; next.q3_producer = null; }
  return next;
}

/** The required answers are there: question 1, and 2 and 3 after Yes (FR-002 §5.1). */
export const isComplete = (a) => a.q1_shoot_in_vn === false || (a.q1_shoot_in_vn === true && Boolean(a.q2_release) && Boolean(a.q3_producer));

/** SC-02 #9 / SR-033: "because of your answers to questions 1, 2 and 3". */
export function reasonText(t, decidedBy) {
  if (!decidedBy || decidedBy.length === 0) return null;
  if (decidedBy.length === 1) return t('router.reason.one', { n: decidedBy[0] });
  return t('router.reason.many', { list: decidedBy.slice(0, -1).join(', '), last: decidedBy.at(-1) });
}

/** SC-02 #12: the other two segments, or all three when the answers matched no rule. */
export const otherCards = (segment) => LETTERS.filter(s => s !== segment);

/** D4: a project needs an account — a guest signs up and comes back; a member creates it with the segment pre-filled (M0 research R11). */
export const confirmAction = ({ signedIn, segment }) => (signedIn
  ? { href: `/projects?new=1&segment=${encodeURIComponent(segment)}` }
  : { href: '/signup?next=%2Fstart' });

/** Spec §3: answers in progress live only in this browser tab; a blocked storage never breaks the page. */
export function saveAnswers(storage, answers) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(answers)); } catch { /* private mode, blocked storage */ }
}

export function loadAnswers(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    return saved && typeof saved === 'object' ? { ...EMPTY_ANSWERS, ...saved } : { ...EMPTY_ANSWERS };
  } catch {
    return { ...EMPTY_ANSWERS };
  }
}

// ---- US-2 override (BR-003, SR-034) --------------------------------------------------------------------
// view = { computed: segment from the table or null, override: picked card or null, saved: 'saved'|'pending'|'failed' }

export function chooseCard(view, card) {
  return { ...view, override: card === view.computed ? null : card, saved: 'pending' };
}

export const saveResult = (view, ok) => ({ ...view, saved: ok ? 'saved' : 'failed' });
export const shownSegment = (view) => view.override ?? view.computed;
export const chosenByYou = (view) => view.override !== null && view.override !== undefined;
/** The cards next to the result: every segment but the one shown, the table's own one included. */
export const cardsFor = (view) => otherCards(shownSegment(view));
