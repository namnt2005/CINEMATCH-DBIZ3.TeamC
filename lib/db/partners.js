// Partner directory, profiles and the partner's own organisation (M4 FR-001..FR-006, BR-001, BR-008),
// node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/partners.js';

const supabase = () => import('./supabase/partners.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const listDirectory = call('listDirectory');
export const getProfile = call('getProfile');
export const getMyOrganisation = call('getMyOrganisation');
export const saveOrgProfile = call('saveOrgProfile');
export const deactivateOrg = call('deactivateOrg');
