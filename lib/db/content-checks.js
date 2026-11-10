// The project content check (M2 FR-011..FR-014, decision D5, research R7), node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/content-checks.js';

const supabase = () => import('./supabase/content-checks.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const saveContentCheck = call('saveContentCheck');
export const latestContentCheck = call('latestContentCheck');
export const reviewFinding = call('reviewFinding');
