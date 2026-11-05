import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOne } from '../../lib/db/client.js';

// Update and archive on node:sqlite (FR-002, BR-005, SR-271; specs/005-m0-workspace research R6, R9).
// Tests run in order: the archive tests come last because they change Rice and Salt for good.
const projects = () => import('../../lib/db/projects.js');

const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const PARK = member('4ef79de6-8efb-58f7-8514-9c0532345ac4');     // The Last Ferry: owner (first member, D2)
const HAN = member('b9916111-9b75-5ab9-b88c-4d578a87cd46');      // The Last Ferry: edit
const LAURENT = member('95f36904-6141-5469-8c63-712a80a4295e');  // Rice and Salt and Harbour Lights: owner
const OKAFOR = member('2985398f-7372-5d92-a85d-117c3a4b91e4');   // Rice and Salt: view
const TANAKA = member('118de3c8-88eb-5003-a2f9-26bbdd0186ae');   // not on The Last Ferry
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const RICE = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';
const HARBOUR_LIGHTS = 'a745bb54-573f-5e8f-9d99-2d7e9af46ccf';    // archived in the seed
const counts = (projectId) => Object.fromEntries(['document_slot', 'collab_request', 'project_member', 'project_province', 'readiness_snapshot']
  .map(t => [t, Number(getOne(`SELECT COUNT(*) AS n FROM ${t} WHERE project_id = ?`, [projectId]).n)]));

describe('updateProject on node:sqlite (T038, FR-002, SR-271)', () => {
  test('FR-002: the owner and an edit member may change the details; updated_at changes on save', async () => {
    const { updateProject } = await projects();
    const before = getOne('SELECT updated_at FROM project WHERE project_id = ?', [FERRY]).updated_at;
    await updateProject(PARK, FERRY, { logline: 'T038 owner edit.' });
    await updateProject(HAN, FERRY, { project_name: 'The Last Ferry' });
    const after = getOne('SELECT logline, updated_at FROM project WHERE project_id = ?', [FERRY]);
    assert.equal(after.logline, 'T038 owner edit.');
    assert.notEqual(after.updated_at, before);
  });

  test('SR-271: a view member gets FORBIDDEN and nothing changes', async () => {
    const { updateProject } = await projects();
    const before = getOne('SELECT logline FROM project WHERE project_id = ?', [RICE]).logline;
    await assert.rejects(updateProject(OKAFOR, RICE, { logline: 'T038 view edit.' }), { code: 'FORBIDDEN' });
    assert.equal(getOne('SELECT logline FROM project WHERE project_id = ?', [RICE]).logline, before);
  });

  test('RLS: a non-member gets NOT_FOUND, never learning that the project exists', async () => {
    const { updateProject, archiveProject } = await projects();
    await assert.rejects(updateProject(TANAKA, FERRY, { logline: 'T038 outsider.' }), { code: 'NOT_FOUND' });
    await assert.rejects(archiveProject(TANAKA, FERRY), { code: 'NOT_FOUND' });
  });

  test('SR-271: a view member cannot archive', async () => {
    const { archiveProject } = await projects();
    await assert.rejects(archiveProject(OKAFOR, RICE), { code: 'FORBIDDEN' });
    assert.equal(getOne('SELECT stage FROM project WHERE project_id = ?', [RICE]).stage, 'preparing');
  });
});

describe('Archived projects are read-only (T038, BR-005)', () => {
  test('BR-005: an archived project refuses every write with ARCHIVED, even for its owner', async () => {
    const { updateProject, archiveProject, inviteMember } = await projects();
    const before = getOne('SELECT * FROM project WHERE project_id = ?', [HARBOUR_LIGHTS]);
    await assert.rejects(updateProject(LAURENT, HARBOUR_LIGHTS, { logline: 'T038 archived edit.' }), { code: 'ARCHIVED' });
    await assert.rejects(archiveProject(LAURENT, HARBOUR_LIGHTS), { code: 'ARCHIVED' });
    await assert.rejects(inviteMember(LAURENT, HARBOUR_LIGHTS, { invitee_email: 't038@example.test', permission: 'view' }), { code: 'ARCHIVED' });
    assert.deepEqual({ ...getOne('SELECT * FROM project WHERE project_id = ?', [HARBOUR_LIGHTS]) }, { ...before });
  });

  test('BR-005: archiving sets stage archived and keeps the documents, requests, members, provinces and snapshots', async () => {
    const { archiveProject } = await projects();
    const before = counts(RICE);
    assert.ok(before.document_slot > 0 && before.collab_request > 0, 'Rice and Salt has documents and requests in the seed');
    await archiveProject(LAURENT, RICE);
    assert.equal(getOne('SELECT stage FROM project WHERE project_id = ?', [RICE]).stage, 'archived');
    assert.deepEqual(counts(RICE), before);
  });

  test('BR-005: once archived, the project leaves the default list and every write is refused', async () => {
    const { listProjects, updateProject } = await projects();
    assert.ok(!(await listProjects(LAURENT)).projects.some(p => p.project_id === RICE));
    assert.ok((await listProjects(LAURENT, { stage: 'archived' })).projects.some(p => p.project_id === RICE));
    await assert.rejects(updateProject(LAURENT, RICE, { project_name: 'T038 after archive' }), { code: 'ARCHIVED' });
  });

  test('BR-005: an archived project is still readable by its members', async () => {
    const { getProject } = await projects();
    assert.equal((await getProject(OKAFOR, RICE)).stage, 'archived');
  });

  test('BR-005: the data layer has no delete', async () => {
    const mod = await projects();
    assert.deepEqual(Object.keys(mod).filter(name => /delete|remove|destroy/i.test(name)), []);
  });
});
