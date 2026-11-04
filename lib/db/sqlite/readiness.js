import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { asReadiness } from '../project-shape.js';

// The local view has every project; membership is checked here, as the PostgreSQL view does (RLS).
const isMember = (projectId, userId) => Boolean(userId) && Boolean(getOne(
  "SELECT 1 AS ok FROM project_member WHERE project_id = ? AND user_id = ? AND invite_status = 'accepted'", [projectId, userId]));

/** The view row of one project for a member, or null (FR-005, BR-001). */
export function getReadiness(projectId, session) {
  if (!isMember(projectId, session?.userId)) return null;
  return asReadiness(getOne('SELECT * FROM v_project_readiness WHERE project_id = ?', [projectId]));
}

/** The view rows of the given projects the caller is a member of, in the given order. */
export function listReadiness(projectIds, session) {
  return projectIds.filter(id => isMember(id, session?.userId))
    .map(id => asReadiness(getOne('SELECT * FROM v_project_readiness WHERE project_id = ?', [id])))
    .filter(Boolean);
}

/** FR-008: one snapshot per non-archived project for the date; a project already recorded is skipped. */
export function snapshotReadiness(date) {
  const due = query(`SELECT r.project_id, r.readiness_total FROM v_project_readiness r JOIN project p ON p.project_id = r.project_id
    WHERE COALESCE(p.stage, '') <> 'archived'
      AND NOT EXISTS (SELECT 1 FROM readiness_snapshot s WHERE s.project_id = r.project_id AND s.snapshot_date = ?)`, [date]);
  withTransaction((db) => {
    const insert = db.prepare('INSERT INTO readiness_snapshot (snapshot_id, project_id, snapshot_date, readiness_total) VALUES (?, ?, ?, ?)');
    for (const r of due) insert.run(randomUUID(), r.project_id, date, Number(r.readiness_total).toFixed(2));
  });
  return { date, inserted: due.length };
}
