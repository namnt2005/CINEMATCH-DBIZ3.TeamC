import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const loadSwitch = () => import('../../lib/i18n/switch.js');

describe('Language choice (T045, FR-005, US-3 Scenario 1)', () => {
  test('FR-005: cookie first, then the browser language (first visit), then Vietnamese', async () => {
    const { pickLocale } = await import('../../lib/i18n/index.js');
    assert.equal(pickLocale('en', 'vi-VN,vi;q=0.9'), 'en');
    assert.equal(pickLocale(undefined, 'en-GB,en;q=0.9'), 'en');
    assert.equal(pickLocale(undefined, 'fr-FR,fr;q=0.9,vi;q=0.8'), 'vi');
    assert.equal(pickLocale('de', 'de-DE'), 'vi');
    assert.equal(pickLocale(undefined, undefined), 'vi');
  });

  test('US-3 Scenario 1: a guest switching to EN gets the cookie for a year and a refresh, no reload', async () => {
    const { switchLocale } = await loadSwitch();
    const cookies = [];
    const fetched = [];
    let refreshed = 0;
    await switchLocale('en', {
      signedIn: false,
      writeCookie: (c) => cookies.push(c),
      fetchImpl: async (...args) => { fetched.push(args); return { ok: true }; },
      refresh: () => { refreshed += 1; }
    });
    assert.equal(cookies.length, 1);
    assert.match(cookies[0], /^locale=en;/);
    assert.match(cookies[0], /max-age=31536000/);
    assert.match(cookies[0], /samesite=lax/i);
    assert.equal(fetched.length, 0);
    assert.equal(refreshed, 1);
  });

  test('FR-005: a signed-in user also saves profile.locale through PATCH /api/account', async () => {
    const { switchLocale } = await loadSwitch();
    const fetched = [];
    await switchLocale('vi', {
      signedIn: true,
      writeCookie: () => {},
      fetchImpl: async (url, init) => { fetched.push({ url, init }); return { ok: true }; },
      refresh: () => {}
    });
    assert.equal(fetched.length, 1);
    assert.equal(fetched[0].url, '/api/account');
    assert.equal(fetched[0].init.method, 'PATCH');
    assert.deepEqual(JSON.parse(fetched[0].init.body), { locale: 'vi' });
  });

  test('FR-005: an unknown language is ignored', async () => {
    const { switchLocale } = await loadSwitch();
    let touched = false;
    await switchLocale('fr', { signedIn: true, writeCookie: () => { touched = true; }, fetchImpl: async () => { touched = true; }, refresh: () => { touched = true; } });
    assert.equal(touched, false);
  });
});
