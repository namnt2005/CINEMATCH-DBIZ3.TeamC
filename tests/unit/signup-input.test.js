import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const loadValidator = () => import('../../lib/auth/signup-input.js');

const VALID = {
  full_name: 'Lena Park', email: 'lena.park@harbourline.example', password: 'correct-horse-42',
  org_name: 'Harbour Line Films', country: 'KR', crew_role: 'producer',
  website: 'https://harbourline.example', terms_accepted: true, locale: 'en'
};

describe('Sign-up validator (T029, FR-001, BR-002, BR-004, research R16)', () => {
  test('FR-001: a complete form is accepted; the email is trimmed and lower-cased, the country upper-cased', async () => {
    const { validateSignUpInput } = await loadValidator();
    const result = validateSignUpInput({ ...VALID, email: '  Lena.Park@Harbourline.example ', country: 'kr' });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.value.email, 'lena.park@harbourline.example');
    assert.equal(result.value.country, 'KR');
  });

  test('FR-001: website is optional', async () => {
    const { validateSignUpInput } = await loadValidator();
    const { website, ...rest } = VALID;
    assert.equal(validateSignUpInput(rest).ok, true);
    assert.equal(validateSignUpInput({ ...rest, website: '' }).ok, true);
  });

  test('FR-001: every broken field is reported at once', async () => {
    const { validateSignUpInput } = await loadValidator();
    const result = validateSignUpInput({
      full_name: '', email: 'not-an-email', password: 'short', org_name: '', country: 'Korea',
      crew_role: 'gaffer', website: `https://${'a'.repeat(300)}.example`, terms_accepted: false
    });
    assert.equal(result.ok, false);
    assert.deepEqual(Object.keys(result.errors).sort(),
      ['country', 'crew_role', 'email', 'full_name', 'org_name', 'password', 'terms_accepted', 'website']);
  });

  test('FR-001: length limits match data/schema (full_name 120, email 254, org_name 200, website 300)', async () => {
    const { validateSignUpInput } = await loadValidator();
    assert.equal(validateSignUpInput({ ...VALID, full_name: 'a'.repeat(120) }).ok, true);
    assert.ok(validateSignUpInput({ ...VALID, full_name: 'a'.repeat(121) }).errors.full_name);
    assert.ok(validateSignUpInput({ ...VALID, email: `${'a'.repeat(250)}@x.vn` }).errors.email);
    assert.ok(validateSignUpInput({ ...VALID, org_name: 'a'.repeat(201) }).errors.org_name);
    assert.ok(validateSignUpInput({ ...VALID, website: `https://${'a'.repeat(293)}` }).errors.website);
  });

  test('FR-001 / BR-004: the password needs 10 to 72 characters', async () => {
    const { validateSignUpInput } = await loadValidator();
    assert.ok(validateSignUpInput({ ...VALID, password: 'a'.repeat(9) }).errors.password);
    assert.equal(validateSignUpInput({ ...VALID, password: 'a'.repeat(10) }).ok, true);
    assert.equal(validateSignUpInput({ ...VALID, password: 'a'.repeat(72) }).ok, true);
    assert.ok(validateSignUpInput({ ...VALID, password: 'a'.repeat(73) }).errors.password);
  });

  test('FR-001: crew_role takes the five values of ck_profile_crew_role', async () => {
    const { validateSignUpInput } = await loadValidator();
    for (const role of ['producer', 'director', 'production_coordinator', 'line_producer', 'other']) {
      assert.equal(validateSignUpInput({ ...VALID, crew_role: role }).ok, true, role);
    }
    assert.ok(validateSignUpInput({ ...VALID, crew_role: 'member' }).errors.crew_role);
  });

  test('BR-003: the terms box must be ticked (true, not a truthy string)', async () => {
    const { validateSignUpInput } = await loadValidator();
    assert.ok(validateSignUpInput({ ...VALID, terms_accepted: 'yes' }).errors.terms_accepted);
    assert.ok(validateSignUpInput({ ...VALID, terms_accepted: undefined }).errors.terms_accepted);
  });

  test('BR-002 / BR-003: role, account status and consent version are never taken from the form', async () => {
    const { validateSignUpInput } = await loadValidator();
    const result = validateSignUpInput({ ...VALID, role: 'admin', account_status: 'active', consent_version: '0.0', user_id: 'x' });
    assert.equal(result.ok, true);
    for (const key of ['role', 'account_status', 'consent_version', 'user_id']) assert.ok(!(key in result.value), key);
  });

  test('BR-004: no error message repeats the password', async () => {
    const { validateSignUpInput } = await loadValidator();
    const result = validateSignUpInput({ ...VALID, password: 'tiny-pw' });
    assert.ok(!JSON.stringify(result.errors).includes('tiny-pw'));
  });
});
