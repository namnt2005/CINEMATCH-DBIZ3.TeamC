import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { query, getOne } from '../../lib/db/client.js';

// Project data layer on node:sqlite (FR-001, FR-003, BR-005, RLS; specs/005-m0-workspace contracts/projects-api).
// The sqlite source has no RLS: the data layer itself must return a project only to its accepted members.
const projects = () => import('../../lib/db/projects.js');
const readiness = () => import('../../lib/db/readiness.js');

const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const PARK = member('4ef79de6-8efb-58f7-8514-9c0532345ac4');     // Harbour Line Films; The Last Ferry, Monsoon Signal, Quiet Harbour Blues
const HAN = member('b9916111-9b75-5ab9-b88c-4d578a87cd46');      // The Last Ferry (edit)
const LAURENT = member('95f36904-6141-5469-8c63-712a80a4295e');  // Rice and Salt (preparing), Harbour Lights (archived)
const TANAKA = member('118de3c8-88eb-5003-a2f9-26bbdd0186ae');   // Lantern Street only
const HARBOUR_ORG = 'f8cd729a-5118-5b4a-a656-6ee31f1b6b12';
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const RICE = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';
const HARBOUR_LIGHTS = 'a745bb54-573f-5e8f-9d99-2d7e9af46ccf';
const INPUT = { project_name: 'T014 Night Ferry', format: 'feature', segment: 'A' };

describe('createProject on node:sqlite (T014, FR-001, D2)', () => {
  test('FR-001: stores a draft with buffer 7 days, the creator\'s organisation, the provinces and one accepted owner', async () => {
    const { createProject } = await projects();
    const { project_id: id } = await createProject(PARK, { ...INPUT, provinces: [1, 2] });
    const project = getOne('SELECT * FROM project WHERE project_id = ?', [id]);
    assert.equal(project.project_name, 'T014 Night Ferry');
    assert.equal(project.stage, 'draft');
    assert.equal(Number(project.buffer_days), 7);
    assert.equal(project.producer_org_id, HARBOUR_ORG);
    const members = query('SELECT * FROM project_member WHERE project_id = ?', [id]);
    assert.equal(members.length, 1);
    assert.deepEqual(
      { user_id: members[0].user_id, permission: members[0].permission, invite_status: members[0].invite_status, invitee_email: members[0].invitee_email },
      { user_id: PARK.userId, permission: 'owner', invite_status: 'accepted', invitee_email: 'lena.park@harbourline.example.kr' }
    );
    assert.deepEqual(query('SELECT province_id FROM project_province WHERE project_id = ? ORDER BY province_id', [id]).map(r => Number(r.province_id)), [1, 2]);
  });

  test('FR-001: a name already used in the organisation is refused with NAME_TAKEN', async () => {
    const { createProject } = await projects();
    await assert.rejects(createProject(PARK, { ...INPUT, project_name: 'The Last Ferry' }), { code: 'NAME_TAKEN' });
  });

  test('research Open question 6: an account without a producer organisation is refused with NO_ORGANISATION', async () => {
    const { createProject } = await projects();
    const userId = randomUUID();
    query("INSERT INTO user_account (user_id, email, email_verified, role, account_status, created_at) VALUES (?, ?, 'true', 'member', 'active', '2026-11-03T09:00:00+07:00')", [userId, `t014-${userId}@example.test`]);
    query("INSERT INTO profile (user_id, full_name, crew_role, locale, producer_org_id) VALUES (?, 'T014 No Organisation', 'producer', 'en', NULL)", [userId]);
    await assert.rejects(createProject(member(userId), { ...INPUT, project_name: 'T014 Orphan' }), { code: 'NO_ORGANISATION' });
  });

  test('FR-001: one transaction — when a province fails, neither the project nor its owner row is stored', async () => {
    const { createProject } = await projects();
    await assert.rejects(createProject(PARK, { ...INPUT, project_name: 'T014 Half Stored', provinces: [1, 9999] }));
    assert.equal(getOne("SELECT COUNT(*) AS n FROM project WHERE project_name = 'T014 Half Stored'").n, 0);
  });
});

describe('Only members read a project (T014, FR-003, BR-005, RLS, SR-044)', () => {
  test('FR-003: listProjects returns only the projects where the user is an accepted member', async () => {
    const { listProjects } = await projects();
    const ids = (await listProjects(HAN)).projects.map(p => p.project_id);
    assert.deepEqual(ids, [FERRY]);
    const tanaka = (await listProjects(TANAKA)).projects.map(p => p.project_id);
    assert.ok(!tanaka.includes(FERRY), 'Tanaka is not on The Last Ferry');
  });

  test('RLS: a pending invitation gives no access, even once the invited email has an account', async () => {
    const { listProjects, getProject } = await projects();
    const pending = getOne("SELECT invitee_email FROM project_member WHERE project_id = ? AND invite_status = 'pending'", [FERRY]);
    const userId = randomUUID();
    query("INSERT INTO user_account (user_id, email, email_verified, role, account_status, created_at) VALUES (?, ?, 'true', 'member', 'active', '2026-11-03T09:00:00+07:00')", [userId, pending.invitee_email]);
    assert.ok(!(await listProjects(member(userId))).projects.some(p => p.project_id === FERRY));
    assert.equal(await getProject(member(userId), FERRY), null);
  });

  test('BR-005: the default list leaves archived projects out; ?stage=archived shows them; counts per stage', async () => {
    const { listProjects } = await projects();
    const all = await listProjects(LAURENT);
    assert.deepEqual(all.projects.map(p => p.project_id), [RICE]);
    assert.deepEqual(all.counts, { draft: 0, preparing: 1, archived: 1 });
    const archived = await listProjects(LAURENT, { stage: 'archived' });
    assert.deepEqual(archived.projects.map(p => p.project_id), [HARBOUR_LIGHTS]);
  });

  test('BR-001: each card carries readiness_total, next_action_primary and the caller\'s permission from the view', async () => {
    const { listProjects } = await projects();
    const ferry = (await listProjects(HAN)).projects[0];
    assert.equal(Number(ferry.readiness_total), 68.75);
    assert.equal(ferry.next_action_primary, 'content.review_findings');
    assert.equal(ferry.permission, 'edit');
  });

  test('RLS: getProject and getReadiness give nothing to a non-member, and the project to a member', async () => {
    const { getProject } = await projects();
    const { getReadiness } = await readiness();
    assert.equal(await getProject(TANAKA, FERRY), null);
    assert.equal(await getReadiness(FERRY, TANAKA), null);
    assert.equal((await getProject(HAN, FERRY)).project_id, FERRY);
    assert.equal(Number((await getReadiness(FERRY, HAN)).readiness_total), 68.75);
  });

  test('RLS: listReadiness drops the projects the caller is not a member of', async () => {
    const { listReadiness } = await readiness();
    const rows = await listReadiness([FERRY, RICE], HAN);
    assert.deepEqual(rows.map(r => r.project_id), [FERRY]);
  });

  test('RLS: a guest reads nothing', async () => {
    const { listProjects, getProject } = await projects();
    const guest = { role: 'guest', isAuthenticated: false, userId: null };
    assert.deepEqual((await listProjects(guest)).projects, []);
    assert.equal(await getProject(guest, FERRY), null);
  });
});
