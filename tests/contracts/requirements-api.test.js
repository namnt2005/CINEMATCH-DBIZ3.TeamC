import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// Public requirements routes with the Supabase fake (T073; FR-015, FR-016, SC-30, SC-31, SR-285: no account needed).
const LEGAL = '11111111-1111-4111-8111-111111111111';
const rule = (n, rule_code, extra = {}) => ({ rule_id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`, rule_code, revision: 1, status: 'approved', is_active: true,
  is_sample: true, title_en: `${rule_code} title`, title_vi: `${rule_code} tiêu đề`, description_en: 'Rule text', description_vi: 'Văn bản luật',
  guidance_en: 'Consider', guidance_vi: 'Cân nhắc', citation: 'Điều 9 khoản 1 điểm c, Luật Điện ảnh số 05/2022/QH15 (mẫu — chờ Ban Pháp chế VFDA kiểm)',
  severity: 'action', topic: 'security', rule_slug: rule_code.toLowerCase(), rule_version: '2026.08', approved_by: LEGAL, approved_at: '2026-08-28T15:30:00+07:00',
  keywords_en: [], keywords_vi: [], segments: ['A', 'B', 'C'], retired_version: null, ...extra });

async function use() {
  const tables = {
    rule_set_version: [{ rule_version: '2026.07', created_at: '2026-07-20T16:00:00+07:00' }, { rule_version: '2026.08', created_at: '2026-08-28T16:00:00+07:00' }],
    legal_rule: [rule(1, 'A9-MIL'), rule(2, 'A13-DOSSIER', { topic: 'dossier', segments: ['A', 'B'] }),
      rule(3, 'A9-HERIT', { status: 'draft', is_active: false, citation: null, rule_version: null, approved_by: null, approved_at: null }),
      rule(4, 'A9-MAP', { status: 'retired', is_active: false, retired_version: '2026.08' })]
  };
  const userClient = fakeSupabase({ user: null, tables });
  const admin = fakeSupabase({ user: null, store: userClient.tables });
  await useFakes({ user: userClient, admin });
}
const req = (url) => new Request(`http://localhost:3000${url}`);
const list = async (qs = '') => (await import('../../app/api/requirements/route.js')).GET(req(`/api/requirements${qs}`));
const one = async (slug) => (await import('../../app/api/requirements/[slug]/route.js')).GET(req(`/api/requirements/${slug}`), { params: { slug } });

describe('Requirements routes (T073)', () => {
  afterEach(resetFakes);

  test('GET /api/requirements as a guest → 200, approved rules in force only, no approver id', async () => {
    await use();
    const res = await list();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.rules.map(r => r.rule_code).sort(), ['A13-DOSSIER', 'A9-MIL']);
    assert.equal(body.rule_version, '2026.08');
    assert.ok(body.rules.every(r => r.approved_by === undefined));
  });

  test('?segment=C leaves out a rule for A and B only; ?topic=dossier keeps only that topic', async () => {
    await use();
    assert.deepEqual((await (await list('?segment=C')).json()).rules.map(r => r.rule_code), ['A9-MIL']);
    assert.deepEqual((await (await list('?topic=dossier')).json()).rules.map(r => r.rule_code), ['A13-DOSSIER']);
  });

  test('422 for an unknown topic or segment', async () => {
    await use();
    for (const qs of ['?topic=weather', '?segment=D']) {
      const res = await list(qs);
      assert.equal(res.status, 422, qs);
      assert.equal((await res.json()).error, 'VALIDATION_ERROR');
    }
  });

  test('GET /api/requirements/:slug → 200 for a rule in force and for a retired one (marked); 404 for a draft or unknown slug', async () => {
    await use();
    const ok = await one('a9-mil');
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.rule.rule_code, 'A9-MIL');
    assert.equal(body.rule.retired, false);
    const retired = await (await one('a9-map')).json();
    assert.equal(retired.rule.retired, true);
    assert.match(retired.rule.retired_at, /^2026-08-28/);
    assert.equal((await one('a9-herit')).status, 404);
    assert.equal((await one('zzz')).status, 404);
  });
});
