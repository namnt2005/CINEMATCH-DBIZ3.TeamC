// SC-23 and SC-25 view rules (M4 FR-012..FR-014, BR-005, BR-006; D7 five steps), pure for the pages and their tests.
import { SERVICE_GROUPS } from '../../lib/partners/service-groups.js';
import { STEPS } from '../../lib/partners/lifecycle.js';

export const NOTE_MAX = 1000;
export const MESSAGE_MAX = 2000;
// SC-25 #13, SR-144, BR-006
export const CONSEQUENCE_KEY = 'requests.consequence';

/** SC-23 #4: the member's non-archived projects where they are owner or edit (SR-343). */
export const eligibleProjects = (projects) => (projects || []).filter(p => ['owner', 'edit'].includes(p.permission) && p.stage !== 'archived');

/** SC-23 #6: the organisation's own groups first, in the fixed order, then the others. */
export const orderedServices = (orgGroups = []) => [...SERVICE_GROUPS.filter(g => orgGroups.includes(g)), ...SERVICE_GROUPS.filter(g => !orgGroups.includes(g))];

/** SC-23 #7: the live counter. */
export const noteCounter = (note) => ({ length: String(note || '').length, max: NOTE_MAX, over: String(note || '').length > NOTE_MAX });

/** SC-23 #10: a project and at least one service; the note within its limit. */
export const canSend = ({ project_id: p, services, note }) => Boolean(p) && Array.isArray(services) && services.length > 0 && !noteCounter(note).over;

/** SC-23 #8, SR-345: the Article 13 notice when the organisation is not eligible (eligibility counts only while Verified). */
export const showArt13Notice = (org) => !(org?.art13_eligible && org?.verified);

/** SC-25 #5: five steps; `step` is how many are reached; the next one is current. */
export const stepper = ({ step }) => STEPS.map((key, i) => ({ key, state: i < (step || 0) ? 'done' : i === (step || 0) ? 'current' : 'todo' }));

/** Declined and withdrawn are end states, not steps (SR-141). */
export const endState = ({ status }) => (status === 'declined' || status === 'withdrawn' ? status : null);

/** SC-25 #9–#11: which controls show for the caller's side. */
export const buttons = ({ can }) => ({
  ndaBox: Boolean(can?.accept_nda),
  confirm: can?.confirm ? 'enabled' : can?.accept_nda ? 'disabled' : 'hidden',
  partner: Boolean(can?.respond),
  withdraw: Boolean(can?.withdraw)
});

/** SC-25 #12: 1–2000 characters. */
export const composerValid = (body) => { const n = String(body || '').trim().length; return n >= 1 && n <= MESSAGE_MAX; };

/** Research OQ4: no partner response for 14 days → the member may withdraw and ask another partner. */
export const showWithdrawHint = ({ status, quiet_days: q }) => status === 'pending' && Number(q) >= 14;
