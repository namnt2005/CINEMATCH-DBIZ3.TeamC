// Online RLS tests against the Supabase dev project (cinematch-dev). NOT part of `npm test` (decision D1).
// Run: npm run test:rls  (= node --env-file=.env --test tests/rls/*.test.js)
// Needs in .env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// the migrations pushed and the seed loaded (specs/003-sys-core/quickstart.md, Slice 1).
// Accounts made here are test fixtures: created with the admin API (no email is sent) and removed afterwards.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const CONSENT_VERSION = '2026-11-01';
const options = { auth: { persistSession: false, autoRefreshToken: false } };

let anon;
let admin;
const created = [];
const createdProjects = [];

async function createTestAccount(metadata) {
  const email = `rls-${randomUUID()}@example.test`;
  const password = `${randomUUID()}Aa1`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
  if (error) throw new Error(`createUser failed: ${error.message}`);
  created.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function signedInClient({ email, password }) {
  const client = createClient(URL, PUBLISHABLE, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  return client;
}

const SIGNUP_METADATA = {
  full_name: 'RLS Test Producer', crew_role: 'producer', org_name: 'RLS Test Films', country: 'GB',
  locale: 'en', consent_version: CONSENT_VERSION
};

describe('Row Level Security on cinematch-dev (npm run test:rls)', () => {
  before(() => {
    const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'].filter(n => !process.env[n]);
    assert.deepEqual(missing, [], `Set ${missing.join(', ')} in .env (see .env.example)`);
    anon = createClient(URL, PUBLISHABLE, options);
    admin = createClient(URL, SECRET, options);
  });

  after(async () => {
    // Test fixtures only: the app never deletes a project (M0 BR-005); the secret key removes what this run made
    for (const id of createdProjects) {
      // M7: the notices hang off the interests (province_notice.interest_id)
      const { data: interests } = await admin.from('location_interest').select('interest_id').eq('project_id', id);
      for (const { interest_id } of interests || []) await admin.from('province_notice').delete().eq('interest_id', interest_id);
      for (const table of ['location_interest', 'readiness_snapshot', 'project_province', 'project_member']) {
        await admin.from(table).delete().eq('project_id', id);
      }
      await admin.from('project').delete().eq('project_id', id);
    }
    for (const id of created) {
      // the sign-up trigger also made a producer_organisation for the fixture (build-log Entry 10)
      const { data: profile } = await admin.from('profile').select('producer_org_id').eq('user_id', id).maybeSingle();
      for (const table of ['consent', 'profile', 'user_account']) {
        await admin.from(table).delete().eq('user_id', id);
      }
      if (profile?.producer_org_id) await admin.from('producer_organisation').delete().eq('producer_org_id', profile.producer_org_id);
      await admin.auth.admin.deleteUser(id);
    }
  });

  // anon has no GRANT on these tables (T013): PostgREST answers 42501 permission denied, stricter than RLS.
  // Either that or 0 rows passes; any readable row fails.
  async function assertAnonReadsNothing(table) {
    const { data, error } = await anon.from(table).select('*').limit(5);
    if (error) {
      assert.ok(error.code === '42501' || /permission denied/i.test(error.message), `${table}: unexpected ${error.code} ${error.message}`);
      return;
    }
    assert.equal(data.length, 0, table);
  }

  test('BR-001 / US-2 Scenario 1: with the publishable key, authority_contact is blocked by GRANT or returns 0 rows', async () => {
    await assertAnonReadsNothing('authority_contact');
  });

  test('BR-001: the table is not empty — the secret key does see the contacts', async () => {
    const { data, error } = await admin.from('authority_contact').select('location_id');
    assert.equal(error, null, error?.message);
    assert.ok(data.length > 0, 'seed loaded');
  });

  test('BR-001: with the publishable key, profiles, consents and the audit log are blocked by GRANT or return 0 rows', async () => {
    for (const table of ['profile', 'consent', 'audit_log']) await assertAnonReadsNothing(table);
  });

  test('US-2 Scenario 2: a signed-in member reads the verified contacts of published locations', async () => {
    const member = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { data, error } = await member.from('authority_contact').select('location_id, contact_verified');
    assert.equal(error, null, error?.message);
    assert.ok(data.length > 0);
    assert.ok(data.every(r => r.contact_verified === true));
  });

  test("BR-001 / M4: a member cannot read another organisation's private layer (no accepted request with NDA)", async () => {
    const { data: all, error: adminError } = await admin.from('organisation_private_layer').select('org_id');
    assert.equal(adminError, null, adminError?.message);
    assert.ok(all.length > 0, 'private layers exist in the seed');

    const member = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { data, error } = await member.from('organisation_private_layer').select('*');
    assert.equal(error, null, error?.message);
    assert.equal(data.length, 0);
  });

  test('BR-002: a new account is always member, even when the sign-up metadata claims another role', async () => {
    const account = await createTestAccount({ ...SIGNUP_METADATA, role: 'admin', account_status: 'active', user_id: randomUUID() });
    const { data, error } = await admin.from('user_account').select('user_id, role, account_status, email_verified').eq('user_id', account.id).single();
    assert.equal(error, null, error?.message);
    assert.equal(data.role, 'member');
    assert.equal(data.account_status, 'active');
  });

  test('BR-002: a member cannot change their own role', async () => {
    const account = await createTestAccount(SIGNUP_METADATA);
    const member = await signedInClient(account);
    await member.from('user_account').update({ role: 'admin' }).eq('user_id', account.id);
    const { data } = await admin.from('user_account').select('role').eq('user_id', account.id).single();
    assert.equal(data.role, 'member');
  });

  test('BR-003 / FR-001: sign-up stores the consent with its version and the time of acceptance', async () => {
    const startedAt = Date.now();
    const account = await createTestAccount(SIGNUP_METADATA);
    const { data, error } = await admin.from('consent').select('consent_version, accepted_at').eq('user_id', account.id);
    assert.equal(error, null, error?.message);
    assert.equal(data.length, 1);
    assert.equal(data[0].consent_version, CONSENT_VERSION);
    const acceptedAt = Date.parse(data[0].accepted_at);
    assert.ok(Math.abs(acceptedAt - startedAt) < 120_000, 'accepted_at is the time of sign-up');

    const { data: profile } = await admin.from('profile').select('full_name, crew_role').eq('user_id', account.id).single();
    assert.equal(profile?.full_name, 'RLS Test Producer');
  });

  // M0 (specs/005-m0-workspace T018): a project is created through app_create_project (research R6;
  // optional arguments have defaults), then read by its owner, by another member and by a guest.
  async function createTestProject() {
    const owner = await createTestAccount(SIGNUP_METADATA);
    const ownerClient = await signedInClient(owner);
    const { data: projectId, error } = await ownerClient.rpc('app_create_project', {
      p_project_name: `RLS project ${randomUUID().slice(0, 8)}`, p_format: 'feature', p_segment: 'A'
    });
    assert.equal(error, null, error?.message);
    assert.ok(projectId, 'app_create_project returns the project id');
    createdProjects.push(projectId);
    return { owner, ownerClient, projectId };
  }

  test('M0 RLS / FR-001: the owner reads their project, its owner row and its readiness row', async () => {
    const { owner, ownerClient, projectId } = await createTestProject();
    const { data: project } = await ownerClient.from('project').select('project_id, stage').eq('project_id', projectId);
    assert.deepEqual(project, [{ project_id: projectId, stage: 'draft' }]);
    const { data: members } = await ownerClient.from('project_member').select('user_id, permission, invite_status').eq('project_id', projectId);
    assert.deepEqual(members, [{ user_id: owner.id, permission: 'owner', invite_status: 'accepted' }]);
    const { data: readiness, error } = await ownerClient.from('v_project_readiness').select('project_id, readiness_total, next_action_primary').eq('project_id', projectId);
    assert.equal(error, null, error?.message);
    assert.equal(readiness.length, 1);
    assert.equal(Number(readiness[0].readiness_total), 0);
    assert.equal(readiness[0].next_action_primary, 'content.start_precheck');
  });

  test('M0 RLS / SR-044: a member who is not on the project reads no project, member or readiness row of it', async () => {
    const { projectId } = await createTestProject();
    const outsider = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    for (const table of ['project', 'project_member', 'project_province', 'readiness_snapshot', 'v_project_readiness']) {
      const { data, error } = await outsider.from(table).select('project_id').eq('project_id', projectId);
      assert.equal(error, null, `${table}: ${error?.message}`);
      assert.equal(data.length, 0, table);
    }
  });

  test('M0 RLS: a member who is not on the project cannot change or archive it, nor invite to it', async () => {
    const { projectId } = await createTestProject();
    const outsider = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    for (const [fn, args] of [
      ['app_update_project', { p_project_id: projectId, p_fields: { logline: 'outsider' } }],
      ['app_archive_project', { p_project_id: projectId }],
      ['app_invite_member', { p_project_id: projectId, p_email: 'outsider@example.test', p_permission: 'edit' }]
    ]) {
      const { error } = await outsider.rpc(fn, args);
      assert.ok(error, `${fn} must refuse a non-member`);
    }
    const { data } = await admin.from('project').select('stage, logline').eq('project_id', projectId).single();
    assert.deepEqual(data, { stage: 'draft', logline: null });
  });

  test('M0 RLS: with the publishable key, projects and the readiness view are blocked by GRANT or return 0 rows', async () => {
    await createTestProject();
    for (const table of ['project', 'project_member', 'v_project_readiness']) await assertAnonReadsNothing(table);
  });

  test('M0 BR-005: an archived project refuses updates, even from its owner', async () => {
    const { ownerClient, projectId } = await createTestProject();
    const { error: archiveError } = await ownerClient.rpc('app_archive_project', { p_project_id: projectId });
    assert.equal(archiveError, null, archiveError?.message);
    const { error } = await ownerClient.rpc('app_update_project', { p_project_id: projectId, p_fields: { logline: 'after archive' } });
    assert.match(error?.message ?? '', /ARCHIVED/);
    const { error: direct } = await ownerClient.from('project').update({ logline: 'direct' }).eq('project_id', projectId);
    const { data } = await admin.from('project').select('stage, logline').eq('project_id', projectId).single();
    assert.deepEqual(data, { stage: 'archived', logline: null }, direct?.message);
  });


  // M7 (specs/006-m7-support T016, research R9). Member fixtures only: no staff account is created or signed in
  // here (decision of Nam Tran, 06/11/2026). That VFDA staff can review, with one audit_log row per review, is
  // checked by Nam Tran signing in as the seed vfda_staff account in the browser (quickstart §Results), by the
  // PGlite run of the migration, and offline by tests/unit/notices-data.test.js.
  const TRANG_AN = '607132bd-b05b-52c6-900f-5f2928c17a9e'; // published, Ninh Bình

  async function createTestNotice() {
    const project = await createTestProject();
    const { error: dateError } = await project.ownerClient.rpc('app_update_project', { p_project_id: project.projectId, p_fields: { shoot_date: '2027-03-01' } });
    assert.equal(dateError, null, dateError?.message);
    const { data, error } = await project.ownerClient.rpc('app_express_interest', { p_project_id: project.projectId, p_location_id: TRANG_AN });
    assert.equal(error, null, error?.message);
    assert.equal(data.created, true);
    return { ...project, noticeId: data.notice_id };
  }

  test('M7 RLS / FR-004: a member who is not on the project reads no interest or notice of it', async () => {
    const { ownerClient, projectId, noticeId } = await createTestNotice();
    const { data: own } = await ownerClient.from('province_notice').select('interest_id, review_status').eq('interest_id', noticeId);
    assert.deepEqual(own, [{ interest_id: noticeId, review_status: 'draft' }], 'the owner reads the draft');
    const outsider = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { data: interests, error } = await outsider.from('location_interest').select('interest_id').eq('project_id', projectId);
    assert.equal(error, null, error?.message);
    assert.equal(interests.length, 0);
    const { data: notices, error: noticeError } = await outsider.from('province_notice').select('interest_id').eq('interest_id', noticeId);
    assert.equal(noticeError, null, noticeError?.message);
    assert.equal(notices.length, 0);
  });

  test('M7 RLS: a member cannot insert an interest or a notice directly — only through app_express_interest', async () => {
    const { ownerClient, projectId } = await createTestProject();
    const { error } = await ownerClient.from('location_interest').insert({
      interest_id: randomUUID(), project_id: projectId, location_id: TRANG_AN, created_at: new Date().toISOString()
    });
    assert.ok(error, 'a direct insert is refused');
    const { data } = await admin.from('location_interest').select('interest_id').eq('project_id', projectId);
    assert.equal(data.length, 0);
  });

  test('M7 BR-001: a project owner cannot review their own notice; it stays submitted and no audit row is written', async () => {
    const { ownerClient, noticeId } = await createTestNotice();
    const { error: submitError } = await ownerClient.rpc('app_submit_notice', { p_interest_id: noticeId });
    assert.equal(submitError, null, submitError?.message);
    for (const decision of ['approve', 'request_changes']) {
      const { error } = await ownerClient.rpc('app_review_notice', { p_interest_id: noticeId, p_decision: decision, p_note: 'self review' });
      assert.match(error?.message ?? '', /FORBIDDEN/, decision);
    }
    const { error: direct } = await ownerClient.from('province_notice').update({ review_status: 'approved' }).eq('interest_id', noticeId);
    const { data: notice } = await admin.from('province_notice').select('review_status, reviewed_by').eq('interest_id', noticeId).single();
    assert.deepEqual(notice, { review_status: 'submitted', reviewed_by: null }, direct?.message);
    const { data: audit } = await admin.from('audit_log').select('action').eq('target_id', noticeId);
    assert.deepEqual(audit, []);
  });
});
