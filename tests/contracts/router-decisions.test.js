import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';
import { post, sessionCookie, YES_ABROAD_FOREIGN } from './router-helpers.js';

const route = () => import('../../app/api/router/decisions/route.js');
const rowsOf = async (sessionKey) => {
  const { query } = await import('../../lib/db/client.js');
  return query('SELECT * FROM segment_decision WHERE session_key = ?', [sessionKey]);
};

describe('POST /api/router/decisions on node:sqlite (T009, FR-002, BR-001, BR-002, D3, US-1)', () => {
  test('US-1 Scenario 1: no sign-in needed; A with the reason and the Needed / Not needed list', async () => {
    const { POST } = await route();
    const res = await POST(post(YES_ABROAD_FOREIGN));
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.segment, 'A');
    assert.equal(body.matched, true);
    assert.deepEqual(body.decided_by, [1, 2, 3]);
    assert.ok(body.segment_decision_id);
    assert.ok(body.requirements.needed.some(r => r.code === 'ART13_LICENCE'));
    assert.ok(body.requirements.not_needed.some(r => r.code === 'FILM_CLASSIFICATION'));
    assert.equal(body.caveat, false);
  });

  test('D3: the first call sets an http-only, SameSite=Lax session cookie; the row is stored under it, with no project', async () => {
    const { POST } = await route();
    const res = await POST(post(YES_ABROAD_FOREIGN));
    const cookie = sessionCookie(res);
    assert.ok(cookie?.value, 'session cookie set');
    assert.ok(cookie.attributes.includes('httponly'));
    assert.ok(cookie.attributes.includes('samesite=lax'));
    assert.ok(cookie.attributes.includes('path=/'));
    const rows = await rowsOf(`session:${cookie.value}`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].project_id, null);
    assert.equal(rows[0].segment, 'A');
    assert.ok(`session:${cookie.value}`.length <= 40, 'fits segment_decision.session_key VARCHAR(40)');
  });

  test('D3: one row per call, under the session the cookie already carries', async () => {
    const { POST } = await route();
    const first = sessionCookie(await POST(post(YES_ABROAD_FOREIGN)));
    await POST(post({ q1_shoot_in_vn: false, q4_needs: [] }, { cookie: first.value }));
    const rows = await rowsOf(`session:${first.value}`);
    assert.deepEqual(rows.map(r => r.segment).sort(), ['A', 'C']);
  });

  test('BR-001: a segment in the request is ignored; the server stores the result of the table', async () => {
    const { POST } = await route();
    const res = await POST(post({ ...YES_ABROAD_FOREIGN, segment: 'C', segment_override: 'B', decided_by: [9] }));
    const body = await res.json();
    assert.equal(body.segment, 'A');
    const [row] = await rowsOf(`session:${sessionCookie(res).value}`);
    assert.equal(row.segment, 'A');
    assert.equal(row.segment_override, null);
  });

  test('BR-002: question 4 does not change the stored segment', async () => {
    const { POST } = await route();
    for (const q4 of [[], ['cast'], ['locations', 'crew', 'cast', 'equipment', 'logistics']]) {
      assert.equal((await (await POST(post({ ...YES_ABROAD_FOREIGN, q4_needs: q4 }))).json()).segment, 'A', String(q4));
    }
  });

  test('Clarifications Q1: co-production in Vietnam → A', async () => {
    const { POST } = await route();
    const body = await (await POST(post({ q1_shoot_in_vn: true, q2_release: 'vietnam', q3_producer: 'coproduction', q4_needs: [] }))).json();
    assert.equal(body.segment, 'A');
  });

  test('Clarifications Q2: segment C answers with the commercial checklist and the legal caveat', async () => {
    const { POST } = await route();
    const body = await (await POST(post({ q1_shoot_in_vn: false, q4_needs: ['cast'] }))).json();
    assert.equal(body.segment, 'C');
    assert.deepEqual(body.decided_by, [1]);
    assert.equal(body.caveat, true);
    assert.ok(body.requirements.needed.some(r => r.code === 'SERVICE_CONTRACT'));
    assert.ok(body.requirements.not_needed.some(r => r.code === 'ART13_LICENCE'));
  });

  test('Spec §3: answers that match no rule → 201 with no segment, and the row is stored for VFDA to see', async () => {
    const { POST } = await route();
    const res = await POST(post({ q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'vietnamese', q4_needs: [] }));
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.deepEqual([body.segment, body.matched, body.decided_by], [null, false, []]);
    const [row] = await rowsOf(`session:${sessionCookie(res).value}`);
    assert.equal(row.segment, null);
    assert.equal(row.segment_rule_id, null);
  });

  test('FR-002: invalid answers → 422 with the fields, and nothing is stored', async () => {
    const { POST } = await route();
    const { getOne } = await import('../../lib/db/client.js');
    const before = getOne('SELECT COUNT(*) AS n FROM segment_decision').n;
    const res = await POST(post({ q1_shoot_in_vn: true, q2_release: 'mars' }));
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error, 'VALIDATION_ERROR');
    assert.ok(body.fields.q2_release && body.fields.q3_producer);
    assert.equal(getOne('SELECT COUNT(*) AS n FROM segment_decision').n, before);
  });

  test('FR-002 / SYS FR-005: requirement labels follow the language of the request', async () => {
    const { POST } = await route();
    const en = await (await POST(post(YES_ABROAD_FOREIGN, { lang: 'en' }))).json();
    const vi = await (await POST(post(YES_ABROAD_FOREIGN, { lang: 'vi' }))).json();
    assert.equal(en.requirements.needed.find(r => r.code === 'ART13_LICENCE').label, 'Filming licence (Article 13)');
    assert.equal(vi.requirements.needed.find(r => r.code === 'ART13_LICENCE').label, 'Giấy phép quay phim sử dụng bối cảnh tại Việt Nam');
  });
});

describe('POST /api/router/decisions on Supabase (T009, System client)', () => {
  afterEach(resetFakes);

  test('D3: the guest\'s row is written by the System client under the session key', async () => {
    const admin = fakeSupabase({
      tables: {
        segment_rule: [{ segment_rule_id: 'r1', q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', result_segment: 'A', version: '2026.1' }],
        segment_requirement: [{ segment: 'A', requirement_code: 'ART13_LICENCE', label_vi: 'Giấy phép', label_en: 'Licence', needed: true }],
        segment_decision: []
      }
    });
    const user = fakeSupabase();
    await useFakes({ user, admin });
    const { POST } = await route();
    const res = await POST(post(YES_ABROAD_FOREIGN));
    assert.equal(res.status, 201);
    assert.equal(admin.tables.segment_decision.length, 1);
    assert.equal(admin.tables.segment_decision[0].session_key, `session:${sessionCookie(res).value}`);
    assert.equal(admin.tables.segment_decision[0].segment, 'A');
    assert.equal(user.calls.length, 0, 'no sign-in, no user client');
  });
});
