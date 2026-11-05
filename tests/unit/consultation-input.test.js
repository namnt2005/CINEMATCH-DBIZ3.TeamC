import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// The consultation request input (T034, FR-005, BR-005, R8): a request, not a slot booking.
const load = () => import('../../lib/consultations/input.js');
const NOW = new Date('2026-11-06T03:00:00.000Z');
const at = (days, hourUtc = 2) => { const d = new Date(NOW.getTime() + days * 86400000); d.setUTCHours(hourUtc, 0, 0, 0); return d.toISOString(); };
const VALID = { topic: 'dossier', timezone: 'Asia/Seoul', preferred_times: [at(14, 1), at(16, 5)] };
const check = async (body) => (await load()).validateConsultationRequest(body, { now: NOW });

describe('validateConsultationRequest (T034)', () => {
  test('BR-005: a valid request gives the times in UTC, the first as slot_start', async () => {
    const out = await check({ ...VALID, preferred_times: ['2026-11-20T10:00:00+09:00', '2026-11-23T14:30:00+09:00'] });
    assert.equal(out.ok, true);
    assert.deepEqual(out.value, {
      topic: 'dossier', timezone: 'Asia/Seoul',
      preferred_times: ['2026-11-20T01:00:00.000Z', '2026-11-23T05:30:00.000Z'], slot_start: '2026-11-20T01:00:00.000Z'
    });
  });

  test('SR-363: the topic is one of the five values', async () => {
    const { TOPICS } = await load();
    assert.deepEqual([...TOPICS], ['dossier', 'locations', 'partners', 'provincial_notice', 'general']);
    for (const topic of TOPICS) assert.equal((await check({ ...VALID, topic })).ok, true, topic);
    for (const topic of ['visa', '', undefined, 'Dossier']) assert.ok((await check({ ...VALID, topic })).errors.topic, String(topic));
  });

  test('SR-361: the time zone is a valid IANA name of at most 40 characters', async () => {
    for (const timezone of ['Asia/Seoul', 'Europe/Paris', 'Asia/Ho_Chi_Minh', 'America/Argentina/Buenos_Aires']) {
      assert.equal((await check({ ...VALID, timezone })).ok, true, timezone);
    }
    for (const timezone of ['Mars/Base', '', undefined, 'Asia/Seoul'.padEnd(41, 'x'), 'not a zone']) {
      assert.ok((await check({ ...VALID, timezone })).errors.timezone, String(timezone));
    }
  });

  test('BR-005: one to three distinct times, each in the future and at most 180 days ahead', async () => {
    const bad = [[], [at(1), at(2), at(3), at(4)], [at(-1)], [at(181)], [at(5), at(5)], ['tomorrow'], 'not a list', undefined];
    for (const preferred_times of bad) {
      assert.ok((await check({ ...VALID, preferred_times })).errors.preferred_times, JSON.stringify(preferred_times));
    }
    for (const preferred_times of [[at(1)], [at(1), at(179)], [at(1), at(2), at(3)]]) {
      assert.equal((await check({ ...VALID, preferred_times })).ok, true, JSON.stringify(preferred_times));
    }
  });

  test('FR-006: every error is a dictionary key in both languages', async () => {
    const out = await check({ topic: 'visa', timezone: 'Mars/Base', preferred_times: [] });
    assert.equal(out.ok, false);
    assert.deepEqual(Object.keys(out.errors).sort(), ['preferred_times', 'timezone', 'topic']);
    const keys = new Set(Object.values(out.errors));
    for (const preferred_times of [[at(-1)], [at(181)], [at(5), at(5)], ['x'], [at(1), at(2), at(3), at(4)]]) {
      keys.add((await check({ ...VALID, preferred_times })).errors.preferred_times);
    }
    for (const key of keys) {
      assert.equal(typeof vi[key], 'string', `vi ${key}`);
      assert.equal(typeof en[key], 'string', `en ${key}`);
    }
  });
});
