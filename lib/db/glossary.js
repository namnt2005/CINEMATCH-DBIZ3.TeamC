// The project glossary of SC-28 (M5 BR-006), node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/drafts.js';

const supabase = () => import('./supabase/drafts.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const listTerms = call('listTerms');
export const saveTerm = call('saveTerm');
export const deleteTerm = call('deleteTerm');
