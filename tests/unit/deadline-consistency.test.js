import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { query } from '../../lib/db/client.js';

// The same deadline on SC-12, SC-27 and SC-29 (T059, SC-005, SR-173, decision D13, analysis C2).
const timeline = () => import('../../lib/db/timeline.js');
const view = () => import('../../lib/licensing/view.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full) : /\.js$/.test(e.name) ? [full] : [];
  });
}

describe('Deadline consistency (T059)', () => {
  test('SC-005: for every seed project the SC-12 strip, the SC-27 line and the SC-29 timeline show the same dates', async () => {
    const { getTimeline } = await timeline();
    const { stripView, dossierLine, recommendedCard } = await view();
    let compared = 0;
    for (const o of query("SELECT pm.project_id, pm.user_id FROM project_member pm WHERE pm.permission = 'owner'")) {
      const t = await getTimeline(member(o.user_id), o.project_id, { today: '2026-11-10' });
      const strip = stripView(t);
      const line = dossierLine(t);
      if (!t.applies || !t.recommended) { assert.equal(strip, null, o.project_id); assert.equal(line, null, o.project_id); continue; }
      assert.equal(strip.date, t.recommended, o.project_id);
      assert.equal(line.recommended, t.recommended, o.project_id);
      assert.equal(line.latest, t.latest, o.project_id);
      assert.equal(recommendedCard(t).date, t.recommended, o.project_id);
      compared++;
    }
    assert.ok(compared >= 4, 'not vacuous');
  });

  test('SR-173: the three screens read getTimeline(); no other file computes working days', () => {
    for (const f of ['app/projects/[id]/page.js', 'app/projects/[id]/dossier/dossier-deadline.js', 'app/projects/[id]/timeline/page.js']) {
      assert.match(fs.readFileSync(f, 'utf8'), /getTimeline/, f);
    }
    const computing = [...files('app'), ...files('lib')].filter(f => !f.startsWith(path.join('lib', 'dates')) && !f.startsWith(path.join('lib', 'licensing')))
      .filter(f => /workingDays(Before|After)\(/.test(fs.readFileSync(f, 'utf8')));
    assert.deepEqual(computing, []);
  });
});
