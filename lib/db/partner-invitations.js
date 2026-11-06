// Partner accounts by VFDA invitation (M4 BR-003, SYS BR-002 as changed 06/11/2026, D2), node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/partner-invitations.js';

const supabase = () => import('./supabase/partner-invitations.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const createInvitation = call('createInvitation');
export const listInvitations = call('listInvitations');
export const getInvitation = call('getInvitation');
export const acceptInvitation = call('acceptInvitation');
export const listInvitableOrganisations = call('listInvitableOrganisations');
