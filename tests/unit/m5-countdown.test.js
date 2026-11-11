import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fakeSupabase, useFakes, resetFakes } from '../contracts/supabase-fake.js';
import { licensingTimeline } from '../../lib/licensing/timeline.js';
import { holidaySet } from '../../lib/dates/working-days.js';
import { stripView } from '../../lib/licensing/view.js';

// M5 countdown entry point (T048; M5 BR-005, FR-007, FR-008, US-3 Sc1, Q7; contracts/countdown-api.contract.md).
// One number everywhere: GET /api/projects/:id/countdown (M5) must give exactly what M2 computes (licensingTimeline and
// the SC-29 route) and what M0 shows on the SC-12 strip (stripView), for two seed projects. Red until the M5 route exists.
const SEED = new URL('../../data/seed/', import.meta.url);
function rows(table) {
  const file = readdirSync(SEED).find(f => f.endsWith(`_${table}.csv`));
  const text = readFileSync(new URL(file, SEED), 'utf8').trim();
  const out = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell); out.push(row); row = []; cell = ''; } else cell += ch;
  }
  row.push(cell); out.push(row);
  const [head, ...body] = out;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const OWNER = '11111111-1111-4111-8111-111111111111';
const PROJECTS = rows('project').filter(p => ['The Last Ferry', 'Quiet Harbour Blues'].includes(p.project_name))
  .map(p => ({ project_id: p.project_id, project_name: p.project_name, segment: p.segment, stage: p.stage, shoot_date: p.shoot_date, buffer_days: Number(p.buffer_days) }));
const HOLIDAYS = rows('public_holiday').map(h => ({ name: h.name, start_date: h.start_date, end_date: h.end_date, is_expected: h.is_expected === 'true' }));
const byName = (n) => PROJECTS.find(p => p.project_name === n);

async function use() {
  const tables = {
    user_account: [{ user_id: OWNER, role: 'member', account_status: 'active' }],
    project: PROJECTS,
    project_member: PROJECTS.map(p => ({ project_id: p.project_id, user_id: OWNER, permission: 'owner', invite_status: 'accepted' })),
    public_holiday: HOLIDAYS, collab_request: [], bilingual_paragraph: []
  };
  const userClient = fakeSupabase({ user: { id: OWNER }, tables });
  await useFakes({ user: userClient, admin: fakeSupabase({ user: { id: OWNER }, store: userClient.tables }) });
}
const req = (url) => new Request(`http://localhost:3000${url}`);
const countdown = async (id, qs = '') => (await import('../../app/api/projects/[id]/countdown/route.js')).GET(req(`/api/projects/${id}/countdown${qs}`), { params: { id } });
const m2 = async (id, qs = '') => (await import('../../app/api/projects/[id]/timeline/route.js')).GET(req(`/api/projects/${id}/timeline${qs}`), { params: { id } });
const omitMilestones = ({ milestones, ...t }) => t;

describe('BR-005: the M5 countdown equals M2 and M0 (T048)', () => {
  afterEach(resetFakes);

  test('for The Last Ferry and Quiet Harbour Blues: M5 = M2 route = licensingTimeline() = M0 SC-12 strip', async () => {
    await use();
    for (const p of PROJECTS) {
      const res = await countdown(p.project_id);
      assert.equal(res.status, 200, `${p.project_name}: M5 route answers`);
      const { timeline_view: m5 } = await res.json();
      const fromM2Route = await (await m2(p.project_id)).json();
      assert.deepEqual(m5, fromM2Route, `${p.project_name}: same body as the M2 SC-29 route`);
      const computed = licensingTimeline(p, holidaySet(HOLIDAYS), m5.today);
      assert.deepEqual(omitMilestones(m5), JSON.parse(JSON.stringify(omitMilestones(computed))), `${p.project_name}: same as licensingTimeline()`);
      assert.deepEqual(stripView(m5), stripView(fromM2Route), `${p.project_name}: same SC-12 strip (M0)`);
    }
  });

  test('US-3 Sc1: The Last Ferry → 05/01/2027 and 02/02/2027; filing on 02/02/2027 with one resubmission → 02/04/2027', async () => {
    await use();
    const t = (await (await countdown(byName('The Last Ferry').project_id)).json()).timeline_view;
    assert.equal(t.recommended, '2027-01-05');
    assert.equal(t.latest, '2027-02-02');
    assert.ok(t.holidays.some(h => h.start_date === '2027-02-05' && h.expected), 'Tết 2027 band expected (US-3 Sc2)');
    const late = (await (await countdown(byName('The Last Ferry').project_id, '?submit=2027-02-02')).json()).timeline_view;
    assert.equal(late.resubmission.result_by_worst, '2027-04-02');
    assert.ok(late.resubmission.result_by_worst > byName('The Last Ferry').shoot_date, 'after the first shooting day');
  });
});

// ---- T048, rest (written 11/11/2026 after T049 — green at once, recorded in the build log) -------------------------
describe('M5 countdown: both paths, the passed date, no second calculation, access (T048)', () => {
  afterEach(resetFakes);

  test('FR-008: both paths always present; the edge case "recommended date passed" gives the number of days', async () => {
    await use();
    for (const p of PROJECTS) {
      const t = (await (await countdown(p.project_id)).json()).timeline_view;
      assert.ok(t.smooth?.result_by && t.resubmission?.result_by_worst, `${p.project_name}: both paths`);
      assert.ok(Array.isArray(t.milestones) && t.milestones.length > 0);
    }
    const blues = (await (await countdown(byName('Quiet Harbour Blues').project_id)).json()).timeline_view;
    assert.equal(blues.recommended_passed, true);
    assert.ok(blues.days_to_recommended < 0, 'the number of days since the recommended date');
  });

  test('BR-005 static: the route reads getTimeline and counts no date itself; lib/documents and lib/drafts import no date code', async () => {
    const fs = await import('node:fs');
    const route = fs.readFileSync('app/api/projects/[id]/countdown/route.js', 'utf8');
    assert.match(route, /getTimeline/);
    assert.doesNotMatch(route, /working-days|licensingTimeline|new Date\(/);
    for (const dir of ['lib/documents', 'lib/drafts']) {
      for (const f of fs.readdirSync(dir)) assert.doesNotMatch(fs.readFileSync(`${dir}/${f}`, 'utf8'), /working-days|licensing\/timeline/, `${dir}/${f}`);
    }
  });

  test('access: 401 guest, 404 for a non-member and a malformed id', async () => {
    const tables = { user_account: [{ user_id: '22222222-2222-4222-8222-222222222222', role: 'member', account_status: 'active' }], project: PROJECTS, project_member: [], public_holiday: HOLIDAYS, collab_request: [], bilingual_paragraph: [] };
    await useFakes({ user: fakeSupabase({ user: null, tables }), admin: fakeSupabase({ user: null, tables }) });
    assert.equal((await countdown(PROJECTS[0].project_id)).status, 401);
    await resetFakes();
    await useFakes({ user: fakeSupabase({ user: { id: '22222222-2222-4222-8222-222222222222' }, tables }), admin: fakeSupabase({ user: null, tables }) });
    assert.equal((await countdown(PROJECTS[0].project_id)).status, 404);
    assert.equal((await countdown('x')).status, 404);
  });
});
