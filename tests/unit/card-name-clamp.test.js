import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const loadCardStyles = () => import('../../app/locations/card-styles.js');

describe('Result-card name clamp (T043, SC-14 #5)', () => {
  test('T043: clampLines(2) cuts text to 2 lines and ends with an ellipsis', async () => {
    const { clampLines } = await loadCardStyles();
    assert.deepEqual(clampLines(2), {
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 2,
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });
  });

  test('T043: clampLines uses the line count it is given', async () => {
    const { clampLines } = await loadCardStyles();
    assert.equal(clampLines(1).WebkitLineClamp, 1);
    assert.equal(clampLines(3).WebkitLineClamp, 3);
  });

  test('T043: the card name style used on SC-14 is clamped to 2 lines', async () => {
    const { cardNameStyle } = await loadCardStyles();
    assert.equal(cardNameStyle.WebkitLineClamp, 2);
    assert.equal(cardNameStyle.overflow, 'hidden');
  });

  test('T043: the card name style keeps every clamp property, so the 200-character ca-mau-cape name cannot spill over', async () => {
    const { clampLines, cardNameStyle } = await loadCardStyles();
    for (const [key, value] of Object.entries(clampLines(2))) {
      assert.equal(cardNameStyle[key], value, `cardNameStyle.${key}`);
    }
  });
});
