import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// The project summary of a notice, built from database data only (T005, FR-002, BR-001, R3, SC-32 #9).
// Line 1 Vietnamese, line 2 English; app.notice_summary in the migration must give the same text.
const load = () => import('../../lib/db/sqlite/notices.js');
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const BLUES = '8b0fd28f-7963-5089-879a-6970d82e04af';
const MONSOON = 'f1419149-4224-59e3-84d5-0697a882957c';

describe('noticeSummary (T005)', () => {
  test('SC-32 #9: The Last Ferry in Ninh Bình — project, format, dates, crew, its Ninh Bình locations, no confirmed partner yet', async () => {
    const { noticeSummary } = await load();
    const s = noticeSummary(FERRY, 19);
    assert.deepEqual(s.missing, []);
    for (const piece of ['The Last Ferry', 'Feature film', '15/03/2027', '24 shooting days', 'crew 15–50', 'Tam Coc – Bich Dong', 'Tràng An Landscape Complex', 'no confirmed Vietnamese partner yet']) {
      assert.ok(s.en.includes(piece), `en: ${piece}`);
    }
    for (const piece of ['The Last Ferry', 'Phim truyện', '15/03/2027', '24 ngày quay', 'Quần thể danh thắng Tràng An', 'Tam Cốc – Bích Động', 'chưa có đối tác Việt Nam được xác nhận']) {
      assert.ok(s.vi.includes(piece), `vi: ${piece}`);
    }
    assert.equal(s.text, `${s.vi}\n${s.en}`);
  });

  test('FR-002: a confirmed Vietnamese partner is named', async () => {
    const { noticeSummary } = await load();
    assert.ok(noticeSummary(BLUES, 7).en.includes('Vietnamese partner: Hạ Long Marine Logistics'));
  });

  test('US-1 Scenario 2: a project without a first shooting day reports it missing', async () => {
    const { noticeSummary } = await load();
    assert.deepEqual(noticeSummary(MONSOON, 30).missing, ['shoot_date']);
  });
});
