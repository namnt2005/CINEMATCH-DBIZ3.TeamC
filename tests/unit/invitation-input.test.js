import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// Invitation and organisation input (T027, BR-002, BR-003; data-model §5).
const input = () => import('../../lib/partners/input.js');

describe('Invitation input (T027)', () => {
  test('email: a valid form, at most 254 characters, kept lower-case', async () => {
    const { validateInvitationEmail } = await input();
    assert.deepEqual(validateInvitationEmail('  Owner@Example.VN '), { ok: true, errors: {}, value: 'owner@example.vn' });
    for (const bad of ['', 'no-at-sign', 'a@b', `${'x'.repeat(250)}@e.vn`, null]) assert.equal(validateInvitationEmail(bad).ok, false, String(bad));
  });

  test('organisation: name 1–200, legal form 1–60, 1+ of the 12 groups, 1+ of the 34 provinces', async () => {
    const { validateOrganisationFields } = await input();
    const ok = { org_name: 'Hanoi New Films', legal_form: 'Công ty TNHH', service_groups: ['crew'], provinces: [1] };
    assert.equal(validateOrganisationFields(ok).ok, true);
    for (const [patch, field] of [[{ org_name: '' }, 'org_name'], [{ org_name: 'x'.repeat(201) }, 'org_name'], [{ legal_form: '' }, 'legal_form'],
      [{ service_groups: [] }, 'service_groups'], [{ service_groups: ['visa'] }, 'service_groups'], [{ provinces: [] }, 'provinces'], [{ provinces: [35] }, 'provinces']]) {
      assert.ok(validateOrganisationFields({ ...ok, ...patch }).errors[field], JSON.stringify(patch));
    }
  });

  test('FR-006 of SYS: every error is a dictionary key in both languages', async () => {
    const { validateOrganisationFields, validateInvitationEmail } = await input();
    const keys = [...Object.values(validateOrganisationFields({}).errors), ...Object.values(validateInvitationEmail('x').errors)];
    assert.ok(keys.length >= 5);
    for (const k of keys) { assert.equal(typeof vi[k], 'string', k); assert.equal(typeof en[k], 'string', k); }
  });
});
