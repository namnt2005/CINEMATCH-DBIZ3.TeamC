import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// Invite and update input (FR-002, FR-004; SC-13 #5–#9, #20–#21; plan D2, H2 decision: stage on SC-13)
const load = () => import('../../lib/projects/input.js');
const TODAY = '2026-11-03';

describe('validateInvite and validateProjectUpdate (T036, FR-002, FR-004)', () => {
  test('FR-004: an email up to 254 characters, trimmed and lower-cased, with view or edit', async () => {
    const { validateInvite } = await load();
    assert.deepEqual(validateInvite({ invitee_email: '  Line.Producer@Example.VN ', permission: 'edit' }),
      { ok: true, errors: {}, value: { invitee_email: 'line.producer@example.vn', permission: 'edit' } });
    assert.equal(validateInvite({ invitee_email: 'not-an-email', permission: 'view' }).errors.invitee_email, 'settings.error.email_invalid');
    assert.equal(validateInvite({ invitee_email: `${'a'.repeat(250)}@x.vn`, permission: 'view' }).errors.invitee_email, 'settings.error.email_invalid');
    assert.equal(validateInvite({ permission: 'view' }).errors.invitee_email, 'settings.error.email_required');
  });

  test('D2: an invitation never grants owner', async () => {
    const { validateInvite } = await load();
    for (const permission of ['owner', 'admin', undefined]) {
      assert.equal(validateInvite({ invitee_email: 'a@b.vn', permission }).errors.permission, 'settings.error.permission_invalid', String(permission));
    }
  });

  test('FR-002: name, shoot date after today, logline and stage draft / preparing; only the fields sent', async () => {
    const { validateProjectUpdate } = await load();
    const ok = validateProjectUpdate({ project_name: ' New name ', shoot_date: '2027-01-01', logline: ' x ', stage: 'preparing' }, { today: TODAY });
    assert.deepEqual(ok, { ok: true, errors: {}, value: { project_name: 'New name', shoot_date: '2027-01-01', logline: 'x', stage: 'preparing' } });
    assert.deepEqual(validateProjectUpdate({ logline: 'only this' }, { today: TODAY }).value, { logline: 'only this' });
    assert.equal(validateProjectUpdate({ shoot_date: TODAY }, { today: TODAY }).errors.shoot_date, 'projects.error.shoot_date_past');
    assert.equal(validateProjectUpdate({ project_name: '' }, { today: TODAY }).errors.project_name, 'projects.error.name_required');
  });

  test('BR-005: stage archived (or anything else) cannot be set through an update — only through Archive', async () => {
    const { validateProjectUpdate } = await load();
    for (const stage of ['archived', 'shot', '']) assert.equal(validateProjectUpdate({ stage }, { today: TODAY }).errors.stage, 'settings.error.stage_invalid', stage);
  });

  test('FR-002: the format and segment are not editable here', async () => {
    const { validateProjectUpdate } = await load();
    assert.deepEqual(validateProjectUpdate({ format: 'tv', segment: 'C', logline: 'x' }, { today: TODAY }).value, { logline: 'x' });
  });

  test('FR-006 of SYS: every error is a dictionary key in both languages', async () => {
    const { validateInvite, validateProjectUpdate } = await load();
    const keys = [...Object.values(validateInvite({ invitee_email: 'x', permission: 'x' }).errors), ...Object.values(validateInvite({}).errors),
      ...Object.values(validateProjectUpdate({ stage: 'x', project_name: '', shoot_date: 'x' }, { today: TODAY }).errors), ...Object.values(validateProjectUpdate({}).errors)];
    for (const key of keys) assert.ok(vi[key] && en[key], key);
  });
});
