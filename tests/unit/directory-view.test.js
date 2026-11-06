import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// SC-19 and SC-20 view rules (T016, FR-002, FR-005, FR-006, BR-004, Q3).
const view = () => import('../../app/partners/directory-view.js');

describe('SC-19 directory view (T016)', () => {
  test('#4–#6: filters come from the URL and go back to it; Verified only is on by default (SR-123)', async () => {
    const { filtersFromSearch, searchFromFilters } = await view();
    assert.deepEqual(filtersFromSearch(new URLSearchParams('')), { q: '', group: '', province: '', language: '', verified_only: true });
    const f = filtersFromSearch(new URLSearchParams('group=casting&province=19&language=ko&verified_only=false&q=ben'));
    assert.deepEqual(f, { q: 'ben', group: 'casting', province: '19', language: 'ko', verified_only: false });
    assert.equal(searchFromFilters(f), 'q=ben&group=casting&province=19&language=ko&verified_only=false');
    assert.equal(searchFromFilters({ q: '', group: '', province: '', language: '', verified_only: true }), '', 'the default writes nothing');
  });

  test('#5, #10: the language filter and the member line are for signed-in users only', async () => {
    const { showLanguageFilter, memberLine } = await view();
    assert.equal(showLanguageFilter(false), false);
    assert.equal(showLanguageFilter(true), true);
    assert.equal(memberLine({ slug: 'x' }), null, 'a guest card has no member line');
    assert.deepEqual(memberLine({ member: { intl_project_count: 12, working_languages: ['en', 'ko'] } }), { count: 12, languages: ['EN', 'KO'] });
  });

  test('#11: Send request leads guests to sign in first, members to SC-23', async () => {
    const { sendRequestHref } = await view();
    assert.equal(sendRequestHref('benxua', false), '/login?next=%2Fpartners%2Fbenxua%2Frequest');
    assert.equal(sendRequestHref('benxua', true), '/partners/benxua/request');
  });

  test('#7, #12: initials replace the logo; Not verified only when the switch is off', async () => {
    const { initials, showNotVerified } = await view();
    assert.equal(initials('Bến Xưa Production Services'), 'BX');
    assert.equal(initials('Hanoi Grip & Light'), 'HG');
    assert.equal(showNotVerified({ verified: false }, true), false);
    assert.equal(showNotVerified({ verified: false }, false), true);
    assert.equal(showNotVerified({ verified: true }, false), false);
  });
});

describe('SC-20 profile view (T016)', () => {
  test('#12: the three-layer indicator reflects the layers actually returned', async () => {
    const { layerIndicator } = await view();
    assert.deepEqual(layerIndicator({ public: true, member: true, private: false }), [
      { layer: 'public', open: true }, { layer: 'member', open: true }, { layer: 'private', open: false }]);
  });

  test('#13: View request replaces Send when the caller has an open or confirmed request', async () => {
    const { requestAction } = await view();
    assert.deepEqual(requestAction(null, true, 'benxua'), { kind: 'send', href: '/partners/benxua/request' });
    assert.deepEqual(requestAction({ request_id: 'r1', status: 'accepted' }, true, 'benxua'), { kind: 'view', href: '/requests/r1' });
    assert.deepEqual(requestAction(null, false, 'benxua'), { kind: 'send', href: '/login?next=%2Fpartners%2Fbenxua%2Frequest' });
    assert.equal(requestAction(null, true, 'benxua', { active: false }).kind, 'none', 'a deactivated organisation takes no request');
  });

  test('#6, Q3: the Article 13 badge shows only while Verified, always with "not legal advice"', async () => {
    const { art13Badge } = await view();
    assert.equal(art13Badge({ art13_eligible: true, verified: false }), null, 'research Open question 6');
    assert.deepEqual(art13Badge({ art13_eligible: true, verified: true }), { label: 'partners.art13.badge', disclaimer: 'partners.art13.not_legal_advice' });
    assert.equal(art13Badge({ art13_eligible: false, verified: true }), null);
    for (const key of ['partners.art13.badge', 'partners.art13.not_legal_advice']) {
      assert.equal(typeof vi[key], 'string', key);
      assert.equal(typeof en[key], 'string', key);
    }
    assert.match(en['partners.art13.not_legal_advice'], /not legal advice/i);
    assert.match(vi['partners.art13.not_legal_advice'], /không phải tư vấn pháp lý/i);
  });

  test('#10, BR-004: what VFDA checked — and what it did not (quality, prices) — in both languages', async () => {
    const { CHECKED_KEYS } = await view();
    for (const key of CHECKED_KEYS) {
      assert.equal(typeof vi[key], 'string', key);
      assert.equal(typeof en[key], 'string', key);
    }
    const notChecked = CHECKED_KEYS.map(k => en[k] || '').join(' ');
    assert.match(notChecked, /quality/i);
    assert.match(notChecked, /price/i);
    assert.match(CHECKED_KEYS.map(k => vi[k] || '').join(' '), /chất lượng[\s\S]*giá|giá[\s\S]*chất lượng/i);
  });
});
