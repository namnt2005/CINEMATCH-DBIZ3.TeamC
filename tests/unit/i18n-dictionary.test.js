import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const loadCheck = () => import('../../scripts/lib/i18n-check.mjs');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

describe('Display dictionary check (T044, FR-006, contracts/i18n.contract.md)', () => {
  test('FR-006: lib/i18n/vi.json and en.json have the same keys and no empty value', () => {
    const vi = readJson('lib/i18n/vi.json');
    const en = readJson('lib/i18n/en.json');
    assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort());
    for (const [key, value] of [...Object.entries(vi), ...Object.entries(en)]) {
      assert.equal(typeof value, 'string', key);
      assert.ok(value.trim().length > 0, `empty value: ${key}`);
    }
  });

  test('FR-006: a key used in code but missing from a dictionary is reported', async () => {
    const { findI18nProblems } = await loadCheck();
    const problems = findI18nProblems({
      files: [{ path: 'app/x.js', text: "t('frame.brand'); t(\"nope.missing\"); t(`auth.error.${code}`); t(`zzz.${x}`)" }],
      messages: { vi: { 'frame.brand': 'A', 'auth.error.X': 'B' }, en: { 'frame.brand': 'A', 'auth.error.X': 'B' } }
    });
    assert.deepEqual(problems.missing.map(p => p.key), ['nope.missing', 'zzz.*']);
  });

  test('FR-006: a key in one file only, or an empty value, is reported', async () => {
    const { findI18nProblems } = await loadCheck();
    const problems = findI18nProblems({ files: [], messages: { vi: { a: 'x', b: '' }, en: { a: 'x', c: 'y' } } });
    assert.deepEqual(problems.mismatched.sort(), ['b', 'c']);
    assert.deepEqual(problems.empty, ['vi:b']);
  });

  test('FR-006: the repository passes the check, and the build runs it first (prebuild)', async () => {
    const { checkRepository } = await loadCheck();
    const problems = checkRepository();
    assert.deepEqual(problems, { missing: [], mismatched: [], empty: [] });
    const pkg = readJson('package.json');
    assert.match(pkg.scripts['check:i18n'] || '', /scripts\/check-i18n\.mjs/);
    assert.match(pkg.scripts.prebuild || '', /check:i18n|check-i18n/);
  });
});
