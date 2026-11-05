import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dictionary, translate } from '../../lib/i18n/index.js';

// Display of the view's action codes (BR-003, specs/005-m0-workspace research R4). Display only: the code
// comes from v_project_readiness, the sentence from the dictionary.
const load = () => import('../../lib/readiness/next-steps.js');
const ACTIONS = {
  content: ['content.start_precheck', 'content.recheck_new_rules', 'content.review_findings', 'done'],
  locations: ['locations.shortlist', 'locations.choose_primary', 'locations.choose_backup', 'done'],
  partners: ['partners.send_request', 'partners.answer_partner', 'partners.confirm', 'partners.await_reply', 'done'],
  dossier: ['dossier.add_missing', 'done'],
  logistics: ['logistics.phase2']
};
const DOCUMENT_TYPES = [
  { doc_code: 'A13_APPLICATION', name_vi: 'Văn bản đề nghị cấp giấy phép theo mẫu', name_en: 'Application form (prescribed template)' },
  { doc_code: 'A13_ART9_COMMITMENT', name_vi: 'Văn bản cam kết không vi phạm Điều 9', name_en: 'Undertaking not to breach Article 9' },
  { doc_code: 'A13_SERVICE_AGREEMENT', name_vi: 'Thỏa thuận hoặc hợp đồng với tổ chức Việt Nam cung cấp dịch vụ', name_en: 'Agreement or contract with the Vietnamese service provider' }
];
const translator = (locale) => (key, vars) => translate(dictionary(locale), key, vars);
const rowWith = (gauge, action, extra = {}) => ({ [`${gauge}_action`]: action, ...extra });

describe('Next-step sentences (T016, BR-003, FR-007, US-2 Scenario 1)', () => {
  test('BR-003: every action code of research R4 has a dictionary sentence in both languages', () => {
    const codes = new Set(Object.values(ACTIONS).flat());
    for (const locale of ['vi', 'en']) {
      for (const code of codes) {
        const text = dictionary(locale)[`dashboard.next.${code}`];
        assert.ok(typeof text === 'string' && text.trim(), `${locale}: dashboard.next.${code} missing`);
      }
    }
  });

  test('BR-003: nextStepText returns exactly one sentence for every gauge and code, never the raw key', async () => {
    const { nextStepText } = await load();
    for (const locale of ['vi', 'en']) {
      for (const [gauge, codes] of Object.entries(ACTIONS)) {
        for (const code of codes) {
          const text = nextStepText(translator(locale), gauge, rowWith(gauge, code, { content_open_findings: 2, dossier_missing: 'A13_ART9_COMMITMENT' }), DOCUMENT_TYPES, locale);
          assert.equal(typeof text, 'string', `${locale} ${gauge} ${code}`);
          assert.ok(text.trim() && !text.includes('dashboard.next.'), `${locale} ${gauge} ${code}: ${text}`);
        }
      }
    }
  });

  test('BR-003: a complete gauge reads Done', async () => {
    const { nextStepText } = await load();
    assert.equal(nextStepText(translator('en'), 'locations', rowWith('locations', 'done'), DOCUMENT_TYPES, 'en'), 'Done');
    assert.equal(dictionary('en')['dashboard.next.done'], 'Done');
  });

  test('US-2 Scenario 1: dossier.add_missing names each missing component in the page language', async () => {
    const { nextStepText } = await load();
    const row = rowWith('dossier', 'dossier.add_missing', { dossier_missing: 'A13_ART9_COMMITMENT,A13_SERVICE_AGREEMENT' });
    const en = nextStepText(translator('en'), 'dossier', row, DOCUMENT_TYPES, 'en');
    const vi = nextStepText(translator('vi'), 'dossier', row, DOCUMENT_TYPES, 'vi');
    for (const code of ['A13_ART9_COMMITMENT', 'A13_SERVICE_AGREEMENT']) {
      const type = DOCUMENT_TYPES.find(d => d.doc_code === code);
      assert.ok(en.includes(type.name_en), `en: ${type.name_en}`);
      assert.ok(vi.includes(type.name_vi), `vi: ${type.name_vi}`);
    }
    assert.ok(!en.includes('Application form'), 'a present component is not named');
  });

  test('research R4: content.review_findings carries the number of open findings', async () => {
    const { nextStepText } = await load();
    for (const locale of ['vi', 'en']) {
      const text = nextStepText(translator(locale), 'content', rowWith('content', 'content.review_findings', { content_open_findings: 3 }), DOCUMENT_TYPES, locale);
      assert.match(text, /\b3\b/, locale);
    }
  });

  test('BR-002: a gauge without an action (not shown for the segment) has no sentence', async () => {
    const { nextStepText } = await load();
    assert.equal(nextStepText(translator('en'), 'dossier', rowWith('dossier', null), DOCUMENT_TYPES, 'en'), null);
  });
});
