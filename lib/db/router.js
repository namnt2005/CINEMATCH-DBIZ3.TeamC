// Segment router data (M1 FR-002, BR-003), node:sqlite or Supabase (specs/003-sys-core D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/router.js';

const supabase = () => import('./supabase/router.js');

export async function getRouterData(...args) {
  return isSupabase() ? (await supabase()).getRouterData(...args) : sqlite.getRouterData(...args);
}
export async function saveDecision(...args) {
  return isSupabase() ? (await supabase()).saveDecision(...args) : sqlite.saveDecision(...args);
}
export async function overrideDecision(...args) {
  return isSupabase() ? (await supabase()).overrideDecision(...args) : sqlite.overrideDecision(...args);
}
