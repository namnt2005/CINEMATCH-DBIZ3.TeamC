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
      // M5: the fixture's documents, slots, drafts and glossary
      await admin.from('document').delete().eq('project_id', id);
      await admin.from('document_slot').delete().eq('project_id', id);
      await admin.from('bilingual_paragraph').delete().eq('project_id', id);
      await admin.from('bilingual_document').delete().eq('project_id', id);
      await admin.from('project_glossary').delete().eq('project_id', id);
      // M2: the fixture's content checks (runs, findings) and pre-check runs
      const { data: m2runs } = await admin.from('compliance_run').select('run_id').eq('project_id', id);
      for (const { run_id } of m2runs || []) await admin.from('compliance_finding').delete().eq('run_id', run_id);
      await admin.from('compliance_run').delete().eq('project_id', id);
      await admin.from('precheck_run').delete().eq('project_id', id);
      // M4: the fixture's requests carry no note, so no message; a final request or a message would be kept by its trigger
      const { error: requestError } = await admin.from('collab_request').delete().eq('project_id', id);
      if (requestError) console.log(`kept: collab_request of fixture project ${id} (${requestError.message}); the next --reset clears it`);
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

  // M4 (specs/007-m4-partners T017, research R3): three layers, three tables, three read policies (BR-001, SC-003).
  test('M4 BR-001 / US-1 Scenario 2: a guest reads the public layer, and 0 rows of the member and private layers', async () => {
    const { data: orgs, error } = await anon.from('organisation').select('org_id, org_name');
    assert.equal(error, null, error?.message);
    assert.ok(orgs.length > 0, 'the public layer is readable');
    for (const table of ['organisation_member_layer', 'organisation_private_layer']) await assertAnonReadsNothing(table);
    const { count } = await admin.from('organisation_private_layer').select('org_id', { count: 'exact', head: true });
    assert.ok(count > 0, 'the private layer has rows, so 0 rows above is access control');
  });

  test('M4 BR-001: a signed-in member reads the member layer, and 0 private-layer rows without an accepted request and both NDA rows', async () => {
    const member = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { data: layer2, error } = await member.from('organisation_member_layer').select('org_id, intl_project_count');
    assert.equal(error, null, error?.message);
    assert.ok(layer2.length > 0, 'member layer readable when signed in');
    const { data: layer3, error: privateError } = await member.from('organisation_private_layer').select('org_id, rate_card, direct_contact');
    assert.ok(privateError === null || privateError.code === '42501', privateError?.message);
    assert.equal((layer3 || []).length, 0, 'no request, no NDA: no rate card, past clients or direct contact');
  });

  test('M4 R4: nobody writes an organisation or its layers directly', async () => {
    const member = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { error } = await member.from('organisation').insert({ org_id: randomUUID(), org_name: 'RLS direct insert', legal_form: 'Công ty TNHH',
      service_groups: ['crew'], provinces: [1], art13_eligible: true });
    assert.ok(error, 'a direct insert is refused');
    const { data } = await admin.from('organisation').select('org_id').eq('org_name', 'RLS direct insert');
    assert.equal(data.length, 0);
  });

  // M4 US-4 (T057, analysis I3): member fixtures only; the positive case (rows after both NDA rows) is checked offline
  // by tests/unit/private-layer-data.test.js and in the browser (quickstart slice 2 step 4).
  const BEN_XUA = '67fc4355-67c0-55f3-a64b-1ad3381c6fdf';
  const FERRY_TO_BEN_XUA = '0bf889da-e22c-5f2d-964f-50993f13e6c7';

  test('M4 BR-001 / FR-004: a member not on The Last Ferry reads 0 rows of Bến Xưa\'s private layer, though that request is accepted with both NDA rows', async () => {
    const { data: request } = await admin.from('collab_request').select('status').eq('request_id', FERRY_TO_BEN_XUA).single();
    assert.equal(request.status, 'accepted');
    const { data: nda } = await admin.from('nda_acceptance').select('party, accepted').eq('request_id', FERRY_TO_BEN_XUA);
    assert.deepEqual(nda.filter(n => n.accepted).map(n => n.party).sort(), ['partner', 'producer']);
    const outsider = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { data, error } = await outsider.from('organisation_private_layer').select('org_id').eq('org_id', BEN_XUA);
    assert.ok(error === null || error.code === '42501', error?.message);
    assert.equal((data || []).length, 0);
  });

  test('M4 BR-001 / BR-005: the fixture\'s own pending request opens nothing; it cannot accept the NDA yet nor insert an NDA row', async () => {
    const { ownerClient, projectId } = await createTestProject();
    const { data: sent, error } = await ownerClient.rpc('app_send_collab_request', { p_project_id: projectId, p_org_id: BEN_XUA, p_services: ['crew'], p_note: null });
    assert.equal(error, null, error?.message);
    assert.equal(sent.status, 'pending');
    const { data: layer3 } = await ownerClient.from('organisation_private_layer').select('org_id').eq('org_id', BEN_XUA);
    assert.equal((layer3 || []).length, 0);
    const { error: ndaError } = await ownerClient.rpc('app_accept_nda', { p_request_id: sent.request_id, p_nda_version: 'NDA-2026.1' });
    assert.ok(ndaError, 'the producer NDA waits for the partner to accept');
    const { error: direct } = await ownerClient.from('nda_acceptance').insert({ nda_acceptance_id: randomUUID(), request_id: sent.request_id, party: 'producer',
      nda_version: 'NDA-2026.1', accepted: true, accepted_at: new Date().toISOString() });
    assert.ok(direct, 'a direct insert is refused');
    const { data: rows } = await admin.from('nda_acceptance').select('nda_acceptance_id').eq('request_id', sent.request_id);
    assert.deepEqual(rows, []);
  });

  // M2 (specs/008-m2-check T033, data-model §7, research R6): member fixtures only.
  test('M2 RLS: a member reads the content check of their own project and none of another; direct writes are refused', async () => {
    const { ownerClient, projectId } = await createTestProject();
    const { data: rule, error: ruleError } = await ownerClient.from('legal_rule').select('rule_id, rule_version').eq('rule_code', 'A9-MIL').eq('status', 'approved').single();
    assert.equal(ruleError, null, ruleError?.message);
    const { data: version } = await ownerClient.from('rule_set_version').select('rule_version').order('rule_version', { ascending: false }).limit(1).single();
    const text = 'Two soldiers row a lantern boat to the river bank at dawn while the street watches from the old bridge in silence.';
    const { error } = await ownerClient.rpc('app_save_content_check', { p_project_id: projectId, p_rule_version: version.rule_version, p_lang: 'en', p_text: text,
      p_findings: [{ rule_id: rule.rule_id, quoted_text: 'Two soldiers' }] });
    assert.equal(error, null, error?.message);
    const { data: own } = await ownerClient.from('compliance_run').select('run_id').eq('project_id', projectId);
    assert.equal(own.length, 1);
    const outsider = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { data: others } = await outsider.from('compliance_run').select('run_id').eq('project_id', projectId);
    assert.equal((others || []).length, 0);
    const { data: findings } = await ownerClient.from('compliance_finding').select('finding_id').eq('run_id', own[0].run_id);
    const { error: upd } = await ownerClient.from('compliance_finding').update({ finding_status: 'reviewed' }).eq('finding_id', findings[0].finding_id);
    const { data: after } = await admin.from('compliance_finding').select('finding_status').eq('finding_id', findings[0].finding_id).single();
    assert.equal(after.finding_status, 'open', upd?.message);
    const { error: ins } = await ownerClient.from('precheck_run').insert({ brief_id: randomUUID(), synopsis_hash: 'x', lang: 'en', dropped_rule_codes: [], created_at: new Date().toISOString() });
    assert.ok(ins, 'a direct insert into precheck_run is refused');
  });

  test('M2 RLS: app_save_content_check refuses a quote that is not in the text, and a member cannot record a pre-check', async () => {
    const { ownerClient, projectId } = await createTestProject();
    const { data: rule } = await ownerClient.from('legal_rule').select('rule_id').eq('rule_code', 'A9-MIL').eq('status', 'approved').single();
    const { data: version } = await ownerClient.from('rule_set_version').select('rule_version').order('rule_version', { ascending: false }).limit(1).single();
    const { error } = await ownerClient.rpc('app_save_content_check', { p_project_id: projectId, p_rule_version: version.rule_version, p_lang: 'en',
      p_text: 'A quiet story about noodles in Đà Lạt with nothing else in it at all.', p_findings: [{ rule_id: rule.rule_id, quoted_text: 'soldiers' }] });
    assert.match(error?.message ?? '', /VALIDATION_ERROR/);
    const { error: record } = await ownerClient.rpc('app_record_precheck', { p_hash: 'x', p_lang: 'en', p_flags: null, p_country: null,
      p_rule_version: version.rule_version, p_project_id: null, p_findings: [], p_dropped_count: 0, p_dropped_rule_codes: [] });
    assert.ok(record, 'only the System actor records pre-checks');
  });

  // M2 US-3 (T016): member fixtures only; the Legal Board steps are run by Nam Tran in the browser.
  test('M2 RLS: a member reads approved, active revisions only, cannot write a rule, reads the version labels; anon reads no version row', async () => {
    const member = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { data: visible, error } = await member.from('legal_rule').select('status, is_active');
    assert.equal(error, null, error?.message);
    assert.ok(visible.length > 0);
    assert.ok(visible.every(r => r.status === 'approved' && r.is_active === true));
    const { error: ins } = await member.from('legal_rule').insert({ rule_id: randomUUID(), rule_code: 'RLS-X', revision: 1, title_vi: 'x', title_en: 'x', description_vi: 'x',
      description_en: 'x', guidance_vi: 'x', guidance_en: 'x', severity: 'notice', topic: 'security', rule_slug: 'rls-x', segments: ['A'], is_sample: false });
    assert.ok(ins, 'a direct insert is refused');
    const { data: versions, error: vErr } = await member.from('rule_set_version').select('rule_version');
    assert.equal(vErr, null, vErr?.message);
    assert.ok(versions.length > 0);
    const { data: anonVersions, error: anonErr } = await anon.from('rule_set_version').select('rule_version');
    assert.ok(anonErr || (anonVersions || []).length === 0, 'anon reads no version row');
  });
  // M5 (specs/009-m5-dossier T019, R12, SR-154): member fixtures only.
  test('M5 RLS: a member reads the slots and documents of their project and none of another; direct writes refused; the kit links are signed-in only', async () => {
    const { ownerClient, projectId } = await createTestProject();
    const path = `${projectId}/A13_ART9_COMMITMENT/${randomUUID()}.pdf`;
    const { error } = await ownerClient.rpc('app_record_document', { p_project_id: projectId, p_doc_code: 'A13_ART9_COMMITMENT', p_file_path: path });
    assert.equal(error, null, error?.message);
    const { data: slots } = await ownerClient.from('document_slot').select('state').eq('project_id', projectId);
    assert.deepEqual((slots || []).map(r => r.state), ['present']);
    const { data: docs } = await ownerClient.from('document').select('version').eq('project_id', projectId);
    assert.deepEqual((docs || []).map(r => r.version), [1]);
    const outsider = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    for (const t of ['document_slot', 'document']) {
      const { data } = await outsider.from(t).select('project_id').eq('project_id', projectId);
      assert.equal((data || []).length, 0, `${t} of another project`);
    }
    const { error: ins } = await ownerClient.from('document').insert({ document_id: randomUUID(), project_id: projectId, doc_code: 'A13_ART9_COMMITMENT', file_path: path, version: 9, uploaded_by: randomUUID(), uploaded_at: new Date().toISOString() });
    assert.ok(ins, 'a direct insert into document is refused');
    const { error: slotIns } = await ownerClient.from('document_slot').insert({ project_id: projectId, doc_code: 'FOREIGN_CREW_LIST', state: 'present' });
    assert.ok(slotIns, 'a direct insert into document_slot is refused');
    const { data: links, error: linkErr } = await ownerClient.from('location_document_type').select('doc_code');
    assert.equal(linkErr, null, linkErr?.message);
    assert.ok((links || []).length > 0);
    const { data: anonLinks, error: anonErr } = await anon.from('location_document_type').select('doc_code');
    assert.ok(anonErr || (anonLinks || []).length === 0, 'anon reads no kit link');
    const { data: listed } = await ownerClient.storage.from('project-documents').list(projectId);
    assert.equal((listed || []).length, 0, 'the member client lists nothing in the private bucket');
  });
  // M5 US-2 (T037, R12, D4): member fixtures only; the NDA-gated partner case is checked offline and by hand (quickstart 6b).
  test('M5 RLS: a member reads the draft, paragraphs and glossary of their project and none of another; direct writes refused', async () => {
    const { ownerClient, projectId } = await createTestProject();
    const { error } = await ownerClient.rpc('app_create_bilingual', { p_project_id: projectId, p_doc_code: 'A13_SCRIPT_VI', p_synopsis_en: 'An invented line.', p_paragraphs: ['An invented line.'] });
    assert.equal(error, null, error?.message);
    const { error: termError } = await ownerClient.rpc('app_save_glossary_term', { p_project_id: projectId, p_term_en: 'ferry', p_term_vi: 'đò' });
    assert.equal(termError, null, termError?.message);
    for (const t of ['bilingual_document', 'bilingual_paragraph', 'project_glossary']) {
      const { data } = await ownerClient.from(t).select('project_id').eq('project_id', projectId);
      assert.equal((data || []).length, 1, `${t} of the member's project`);
    }
    const outsider = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    for (const t of ['bilingual_document', 'bilingual_paragraph', 'project_glossary']) {
      const { data } = await outsider.from(t).select('project_id').eq('project_id', projectId);
      assert.equal((data || []).length, 0, `${t} of another project`);
    }
    await ownerClient.from('bilingual_paragraph').update({ status: 'reviewed' }).eq('project_id', projectId);
    const { data: after } = await admin.from('bilingual_paragraph').select('status').eq('project_id', projectId).single();
    assert.equal(after.status, 'machine', 'a direct update is refused');
    const { error: ins } = await ownerClient.from('project_glossary').insert({ project_id: projectId, term_en: 'karst', term_vi: 'đá vôi' });
    assert.ok(ins, 'a direct insert into project_glossary is refused');
  });
});
