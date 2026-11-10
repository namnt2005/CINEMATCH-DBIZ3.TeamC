// The legal rule base (M2 FR-001..FR-004, BR-002, BR-007, BR-008, Q2, Q3, Q13), node:sqlite or Supabase (003 D4).
// Retired, never deleted: there is no delete here (BR-008).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/legal-rules.js';

const supabase = () => import('./supabase/legal-rules.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const listRules = call('listRules');
export const getRule = call('getRule');
export const saveDraft = call('saveDraft');
export const reviseRule = call('reviseRule');
export const signRule = call('signRule');
export const retireRule = call('retireRule');
export const listVersions = call('listVersions');
