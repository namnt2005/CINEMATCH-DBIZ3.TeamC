import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { query } from '../../lib/db/client.js';

// SC-003, BR-001, SR-043: the project list (SC-10) and the dashboard (SC-12) show the same numbers
const projects = () => import('../../lib/db/projects.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });

describe('List and dashboard agree (T029, SC-003, BR-001)', () => {
  test('SC-003: for every seed project, the card and the dashboard read the same readiness and next step', async () => {
    const { listProjects, getProject } = await projects();
    const members = query("SELECT project_id, user_id FROM project_member WHERE invite_status = 'accepted' AND user_id IS NOT NULL");
    const seen = new Set();
    for (const m of members) {
      const session = member(m.user_id);
      const open = await listProjects(session);
      const archived = await listProjects(session, { stage: 'archived' });
      const card = [...open.projects, ...archived.projects].find(p => p.project_id === m.project_id);
      const dashboard = await getProject(session, m.project_id);
      assert.ok(card && dashboard, m.project_id);
      assert.equal(card.readiness_total, dashboard.readiness.readiness_total, m.project_id);
      assert.equal(card.next_action_primary, dashboard.readiness.next_action_primary, m.project_id);
      seen.add(m.project_id);
    }
    assert.equal(seen.size, query('SELECT COUNT(*) AS n FROM project')[0].n, 'every seed project checked');
  });
});
