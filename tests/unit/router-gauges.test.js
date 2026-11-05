import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv } from '../../lib/db/client.js';

// M1 after decision D1 of specs/005-m0-workspace: the GAUGE_* rows of segment_requirement belong to M0
const load = () => import('../../lib/router/decide.js');
const [header, ...rows] = parseCsv(fs.readFileSync('data/seed/08_segment_requirement.csv', 'utf8'));
const REQUIREMENTS = rows.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])))
  .map(r => ({ ...r, needed: r.needed === 'true' }));

describe('M1 router and the M0 gauge rows (T003, M1 FR-002, D1)', () => {
  test('D1: splitRequirements never lists a GAUGE_* code on SC-02', async () => {
    const { splitRequirements } = await load();
    for (const segment of ['A', 'B', 'C']) {
      for (const locale of ['vi', 'en']) {
        const { needed, not_needed } = splitRequirements(segment, REQUIREMENTS, locale);
        for (const item of [...needed, ...not_needed]) assert.ok(!item.code.startsWith('GAUGE_'), `${segment} ${item.code}`);
      }
    }
  });

  test('D1: journeyConfig lists no GAUGE_* code among the requirements', async () => {
    const { journeyConfig } = await load();
    for (const segment of ['A', 'B', 'C']) {
      const config = journeyConfig(segment, REQUIREMENTS, []);
      for (const code of [...config.needed, ...config.not_needed]) assert.ok(!code.startsWith('GAUGE_'), `${segment} ${code}`);
    }
  });

  test('D1, BR-002: journeyConfig().gauges are the counted GAUGE_* rows of the segment', async () => {
    const { journeyConfig } = await load();
    assert.deepEqual(journeyConfig('A', REQUIREMENTS).gauges, ['content', 'locations', 'partners', 'dossier']);
    assert.deepEqual(journeyConfig('B', REQUIREMENTS).gauges, ['content', 'locations', 'partners', 'dossier']);
    assert.deepEqual(journeyConfig('C', REQUIREMENTS).gauges, ['content', 'locations', 'partners']);
  });

  test('BR-004: a gauge row turned to not needed leaves the journey gauges, with no code change', async () => {
    const { journeyConfig } = await load();
    const changed = REQUIREMENTS.map(r => (r.segment === 'A' && r.requirement_code === 'GAUGE_PARTNERS' ? { ...r, needed: false } : r));
    assert.deepEqual(journeyConfig('A', changed).gauges, ['content', 'locations', 'dossier']);
  });
});
