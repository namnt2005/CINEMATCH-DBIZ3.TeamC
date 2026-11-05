// Projects, members and invitations (M0 FR-001..FR-004, BR-005), node:sqlite or Supabase (003 D4).
// There is no delete: projects are archived (BR-005).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/projects.js';

const supabase = () => import('./supabase/projects.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export { ProjectError } from './project-shape.js';
export const createProject = call('createProject');
export const listProjects = call('listProjects');
export const getProject = call('getProject');
export const updateProject = call('updateProject');
export const archiveProject = call('archiveProject');
export const inviteMember = call('inviteMember');
export const listInvitations = call('listInvitations');
export const acceptInvitation = call('acceptInvitation');
