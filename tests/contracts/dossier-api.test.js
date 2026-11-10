import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// GET /api/projects/:id/dossier with the Supabase fake (T046; contracts/project-checks-api.contract.md; FR-008, FR-009, BR-005).
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PROJECT = '44444444-4444-4444-8444-444444444444';
const SEG_C = '55555555-5555-4555-8555-555555555555';
const TYPES = [['A13_APPLICATION', 1], ['A13_SCRIPT_VI', 2], ['A13_SERVICE_AGREEMENT', 3], ['A13_ART9_COMMITMENT', 4]];

function fakes(user) {
  const tables = {
    user_account: [{ user_id: OWNER, role: 'member', account_status: 'active' }, { user_id: OTHER, role: 'member', account_status: 'active' }],
    project: [{ project_id: PROJECT, project_name: 'Rice and Salt', segment: 'B', stage: 'preparing' }, { project_id: SEG_C, project_name: 'Monsoon', segment: 'C', stage: 'draft' }],
    project_member: [{ project_id: PROJECT, user_id: OWNER, permission: 'owner', invite_status: 'accepted' }, { project_id: SEG_C, user_id: OWNER, permission: 'owner', invite_status: 'accepted' }],
    document_type: TYPES.map(([doc_code]) => ({ doc_code, name_vi: `${doc_code} vi`, name_en: `${doc_code} en`, basis: 'law', template_url: `https://storage.cinematch.example/templates/${doc_code.toLowerCase()}.docx` })),
    v_dossier_check: TYPES.map(([doc_code, ord]) => ({ project_id: PROJECT, doc_code, ord, stored_state: ord === 1 ? 'present' : 'missing', state: ord === 1 ? 'present' : 'missing' }))
  };
  const userClient = fakeSupabase({ user, tables });
  const admin = fakeSupabase({ user, store: userClient.tables });
  return { userClient, admin };
}
async function use(user) { const f = fakes(user); await useFakes({ user: f.userClient, admin: f.admin }); return f; }
const get = async (id) => (await import('../../app/api/projects/[id]/dossier/route.js')).GET(new Request(`http://localhost:3000/api/projects/${id}/dossier`), { params: { id } });

describe('GET /api/projects/:id/dossier (T046)', () => {
  afterEach(async () => { await resetFakes(); });

  test('200: four components a–d with state, what was checked automatically and what needs a person, and the action', async () => {
    await use({ id: OWNER });
    const res = await get(PROJECT);
    assert.equal(res.status, 200);
    const d = await res.json();
    assert.equal(d.applies, true);
    assert.equal(d.segment, 'B');
    assert.equal(d.present, 1);
    assert.equal(d.total, 4);
    assert.equal(Number(d.completeness_pct), 25);
    assert.equal(d.verdict, 'not_ready');
    assert.ok(d.checked_at);
    assert.deepEqual(d.components.map(c => [c.letter, c.doc_code, c.state]),
      [['a', 'A13_APPLICATION', 'present'], ['b', 'A13_SCRIPT_VI', 'missing'], ['c', 'A13_SERVICE_AGREEMENT', 'missing'], ['d', 'A13_ART9_COMMITMENT', 'missing']]);
    for (const c of d.components) {
      assert.ok(Array.isArray(c.auto_checked) && c.auto_checked.length, c.doc_code);
      assert.ok(Array.isArray(c.needs_person) && c.needs_person.length, c.doc_code);
      assert.ok(c.action && c.name_en && c.name_vi && c.template_url, c.doc_code);
    }
  });

  test('401 guest; 404 for a non-member and a malformed id; segment C → applies false and no component', async () => {
    await use(null);
    assert.equal((await get(PROJECT)).status, 401);
    await resetFakes();
    await use({ id: OTHER });
    assert.equal((await get(PROJECT)).status, 404);
    assert.equal((await get('not-a-uuid')).status, 404);
    await resetFakes();
    await use({ id: OWNER });
    const c = await (await get(SEG_C)).json();
    assert.equal(c.applies, false);
    assert.deepEqual(c.components, []);
  });
});
