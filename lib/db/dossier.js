// The Article 13 dossier check (M2 FR-008..FR-010, BR-005), node:sqlite or Supabase (003 D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/dossier.js';

const supabase = () => import('./supabase/dossier.js');
const call = (name) => async (...args) => (isSupabase() ? (await supabase())[name](...args) : sqlite[name](...args));

export const getDossier = call('getDossier');
