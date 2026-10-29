import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  noDataLabel,
  nightShootingLabel,
  rainyMonthsLabel,
  monthsToAvoidLabel
} from '../../lib/locations/season-facts.js';

describe('Vietnamese season labels shown on SC-16 (T046, BR-003, Clarifications Q3)', () => {
  test('T046: night_shooting_allowed yes / no / ask read Có / Không / Hỏi địa phương', () => {
    assert.equal(nightShootingLabel('yes', 'vi'), 'Có');
    assert.equal(nightShootingLabel('no', 'vi'), 'Không');
    assert.equal(nightShootingLabel('ask', 'vi'), 'Hỏi địa phương');
  });

  test('BR-003: missing values read "Chưa có dữ liệu", never "Không"', () => {
    assert.equal(noDataLabel('vi'), 'Chưa có dữ liệu');
    for (const missing of [null, undefined, '']) {
      assert.equal(nightShootingLabel(missing, 'vi'), 'Chưa có dữ liệu');
      assert.equal(rainyMonthsLabel(missing, 'vi'), 'Chưa có dữ liệu');
      assert.equal(monthsToAvoidLabel(missing, 'vi'), 'Chưa có dữ liệu');
    }
  });

  test('Clarifications Q3: month lists are sorted; [] means none recorded', () => {
    assert.equal(rainyMonthsLabel([8, 6, 7], 'vi'), 'Tháng 6, 7, 8');
    assert.equal(monthsToAvoidLabel('[12,1]', 'vi'), 'Tháng 1, 12');
    assert.equal(rainyMonthsLabel([], 'vi'), 'Không có tháng mưa');
    assert.equal(monthsToAvoidLabel('[]', 'vi'), 'Không có tháng cần tránh');
  });
});
