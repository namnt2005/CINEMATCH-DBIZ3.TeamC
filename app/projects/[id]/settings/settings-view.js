// Pure view rules of SC-13 Project settings (docs/screens/screen-spec-SC-13.md; specs/005-m0-workspace T040).
// The database functions enforce the same rules; these only decide what the screen offers (SR-271, SR-272, SR-275).
import { EDITABLE_STAGES } from '../../../../lib/projects/input.js';

const EDITORS = ['owner', 'edit'];
const open = (project) => project?.stage !== 'archived';
// SYS BR-005: a deactivated account keeps its rows with an anonymous email
const FORMER = /^former-member-[^@]*@anonymised\.example$/;

/** SR-271: owner and edit change details and stage; view and archived projects are read-only. */
export const canEdit = (project) => EDITORS.includes(project?.permission) && open(project);

/** SR-272: only the owner invites, and not on an archived project. */
export const canInvite = (project) => project?.permission === 'owner' && open(project);

/** SC-13 #23–#24, SR-275: archive for owner and edit, hidden once archived. There is no delete. */
export const showArchive = (project) => EDITORS.includes(project?.permission) && open(project);

/** Plan decision on analysis H2 (03/11/2026): editors choose Draft or Preparing on SC-13. */
export const stageOptions = (project) => (canEdit(project) ? [...EDITABLE_STAGES] : []);

/** SC-13 Empty state: nobody else is on the project, nobody is invited. */
export const isAlone = (members) => (members || []).length <= 1;

/** SC-13 #17–#19: name (or Former member), email when the caller may see it, role and status keys. */
export function memberLine(m) {
  const former = FORMER.test(String(m.invitee_email || ''));
  return {
    name: former ? 'settings.members.former' : m.full_name || null,
    email: former ? null : m.invitee_email || null,
    role: `projects.permission.${m.permission}`,
    status: `settings.status.${m.invite_status === 'pending' ? 'pending' : 'accepted'}`
  };
}
