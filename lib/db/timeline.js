// The licensing timeline of a project (M2 FR-017, FR-018, BR-006), node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/timeline.js';

const supabase = () => import('./supabase/timeline.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const getTimeline = call('getTimeline');
