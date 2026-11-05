// Readiness rows of v_project_readiness (M0 FR-005..FR-008, BR-001), node:sqlite or Supabase (003 D4).
// The view computes everything; these functions only read it, for members of the project.
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/readiness.js';

const supabase = () => import('./supabase/readiness.js');

export async function getReadiness(...args) {
  return isSupabase() ? (await supabase()).getReadiness(...args) : sqlite.getReadiness(...args);
}
export async function listReadiness(...args) {
  return isSupabase() ? (await supabase()).listReadiness(...args) : sqlite.listReadiness(...args);
}
export async function snapshotReadiness(...args) {
  return isSupabase() ? (await supabase()).snapshotReadiness(...args) : sqlite.snapshotReadiness(...args);
}
