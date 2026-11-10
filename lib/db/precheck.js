// The content pre-check (M2 FR-005..FR-007, FR-011, FR-012, BR-001, BR-004, BR-007), node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/precheck.js';

const supabase = () => import('./supabase/precheck.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const runPrecheck = call('runPrecheck');
export const recordPrecheck = call('recordPrecheck');
export const getPrecheck = call('getPrecheck');
export const precheckBasis = call('precheckBasis');
