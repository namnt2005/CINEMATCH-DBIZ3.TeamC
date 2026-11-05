import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// The provincial letter (T009, BR-001, BR-002, R3, Clarifications Q2). Pure: notice data + recipient → paragraphs.
const load = () => import('../../lib/notices/letter.js');
const NOTICE = {
  projectName: 'Rice and Salt', provinceName: 'Ninh Bình',
  summary: 'Rice and Salt — documentary; first shooting day 10/05/2027; 18 shooting days; crew under 15; locations: Tràng An Landscape Complex.'
};
const BR002_VI = 'Thư này không thay thế giấy phép quay phim do Bộ Văn hóa, Thể thao và Du lịch cấp.';
const BR002_EN = 'This letter does not replace the filming licence issued by the Ministry of Culture, Sports and Tourism.';
const text = (letter) => letter.paragraphs.map(p => p.text).join('\n');

describe('buildLetter (T009, BR-002, BR-001)', () => {
  for (const recipient of ['peoples_committee', 'culture_department']) {
    test(`BR-002: the letter to ${recipient} always carries the sentence in Vietnamese and English`, async () => {
      const { buildLetter } = await load();
      const all = text(buildLetter(NOTICE, recipient));
      assert.ok(all.includes(BR002_VI), 'Vietnamese sentence');
      assert.ok(all.includes(BR002_EN), 'English sentence');
    });
  }

  test('Clarifications Q2: the addressee follows the recipient the crew chose', async () => {
    const { buildLetter } = await load();
    const pc = buildLetter(NOTICE, 'peoples_committee').paragraphs;
    const dc = buildLetter(NOTICE, 'culture_department').paragraphs;
    assert.match(pc[0].text, /^Kính gửi: Ủy ban nhân dân .*Ninh Bình/);
    assert.match(dc[0].text, /^Kính gửi: Sở Văn hóa, Thể thao và Du lịch .*Ninh Bình/);
    assert.ok(pc.some(p => p.lang === 'en' && /People's Committee/.test(p.text) && p.text.includes('Ninh Bình')));
    assert.ok(dc.some(p => p.lang === 'en' && /Department of Culture, Sports and Tourism/.test(p.text) && p.text.includes('Ninh Bình')));
  });

  test('R3: Vietnamese first, then the English translation; the summary is in the letter', async () => {
    const { buildLetter } = await load();
    const langs = buildLetter(NOTICE, 'peoples_committee').paragraphs.map(p => p.lang);
    assert.equal(langs[0], 'vi');
    assert.ok(langs.lastIndexOf('vi') < langs.indexOf('en'), `order ${langs.join(',')}`);
    assert.ok(text(buildLetter(NOTICE, 'peoples_committee')).includes('Rice and Salt'));
  });

  test('BR-001: the letter never says VFDA sends it', async () => {
    const { buildLetter } = await load();
    assert.doesNotMatch(text(buildLetter(NOTICE, 'peoples_committee')), /VFDA (sends|will send|has sent)|sent by VFDA|VFDA gửi|do VFDA gửi/i);
  });

  test('Clarifications Q2: an unknown recipient is refused', async () => {
    const { buildLetter } = await load();
    assert.throws(() => buildLetter(NOTICE, 'ministry'));
  });
});
