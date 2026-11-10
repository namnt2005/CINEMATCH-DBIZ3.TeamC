// The public requirements library (M2 FR-015, FR-016; SC-30, SC-31), node:sqlite or Supabase (003 D4). Guests read it.
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/requirements.js';

const supabase = () => import('./supabase/requirements.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const listRequirements = call('listRequirements');
export const getRequirement = call('getRequirement');
