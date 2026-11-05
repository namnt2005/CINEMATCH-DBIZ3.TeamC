import { userDb, systemDb, rows } from './util.js';
import { asReadiness } from '../project-shape.js';

// public.v_project_readiness already returns only the caller's projects (app.is_project_member, research R3).
// A database error is thrown: the API answers 503 and the screen shows "—", never 0 % (US-2 Scenario 3).

export async function getReadiness(projectId) {
  const db = await userDb();
  return asReadiness(rows(await db.from('v_project_readiness').select('*').eq('project_id', projectId).maybeSingle()));
}

export async function listReadiness(projectIds) {
  if (!projectIds.length) return [];
  const db = await userDb();
  const list = rows(await db.from('v_project_readiness').select('*').in('project_id', projectIds)).map(asReadiness);
  return projectIds.map(id => list.find(r => r.project_id === id)).filter(Boolean);
}

/** FR-008 by hand (npm run snapshot) or where pg_cron is missing: the System runs app_snapshot_readiness. */
export async function snapshotReadiness(date) {
  const db = await systemDb();
  const inserted = rows(await db.rpc('app_snapshot_readiness', { p_date: date }));
  return { date, inserted: Number(inserted) || 0 };
}
