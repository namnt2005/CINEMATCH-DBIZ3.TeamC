import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Project glossary helpers (T030; M5 BR-006, SC-28 #9, SR-164; research R6).
const g = () => import('../../lib/drafts/glossary.js');

describe('glossary helpers (T030)', () => {
  test('applyGlossary: whole words, case-insensitive; other words untouched', async () => {
    const { applyGlossary } = await g();
    const glossary = [{ term_en: 'ferry', term_vi: 'đò' }];
    assert.equal(applyGlossary('The Ferry leaves; the ferryman waits.', glossary), 'The đò leaves; the ferryman waits.');
  });

  test('glossaryMismatches: the source has term_en and the Vietnamese lacks term_vi', async () => {
    const { glossaryMismatches } = await g();
    const paras = [{ idx: 1, source_text: 'The ferry.', target_text: 'Chiếc đò.' }, { idx: 2, source_text: 'A ferry again.', target_text: 'Chiếc phà.' },
      { idx: 3, source_text: 'No term here.', target_text: 'Không có.' }];
    assert.deepEqual(glossaryMismatches(paras, [{ term_en: 'ferry', term_vi: 'đò' }]), [2]);
  });

  test('validateTerm: 1–120 characters each, trimmed; a duplicate (case-insensitive) and the 201st term are refused', async () => {
    const { validateTerm } = await g();
    assert.deepEqual(validateTerm({ term_en: ' Ferry ', term_vi: ' đò ' }, []), { ok: true, value: { term_en: 'Ferry', term_vi: 'đò' } });
    assert.equal(validateTerm({ term_en: '', term_vi: 'x' }, []).error, 'glossary.error.term');
    assert.equal(validateTerm({ term_en: 'x'.repeat(121), term_vi: 'x' }, []).error, 'glossary.error.term');
    assert.equal(validateTerm({ term_en: 'FERRY', term_vi: 'x' }, [{ term_en: 'ferry' }]).error, 'glossary.error.exists');
    assert.equal(validateTerm({ term_en: 'new', term_vi: 'x' }, Array.from({ length: 200 }, (_, i) => ({ term_en: `t${i}` }))).error, 'glossary.error.limit');
  });
});
