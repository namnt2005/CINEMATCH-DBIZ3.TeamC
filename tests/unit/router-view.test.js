import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const load = () => import('../../app/start/router-view.js');
const EMPTY = { q1_shoot_in_vn: null, q2_release: null, q3_producer: null, q4_needs: null };
const fakeT = (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key);

describe('SC-02 view helpers (T011, FR-001, D4, SC-02 §3–§5, spec §3 edge cases)', () => {
  test('SC-02 #2: progress counts the answered questions out of 4 (question 4 counts once answered, even with nothing ticked)', async () => {
    const { progress } = await load();
    assert.equal(progress(EMPTY), 0);
    assert.equal(progress({ ...EMPTY, q1_shoot_in_vn: true, q2_release: 'abroad' }), 2);
    assert.equal(progress({ q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', q4_needs: [] }), 4);
  });

  test('SC-02 Default: one question at a time; questions 2 and 3 only after Yes', async () => {
    const { visibleQuestions } = await load();
    assert.deepEqual(visibleQuestions(EMPTY), [1]);
    assert.deepEqual(visibleQuestions({ ...EMPTY, q1_shoot_in_vn: true }), [1, 2]);
    assert.deepEqual(visibleQuestions({ ...EMPTY, q1_shoot_in_vn: true, q2_release: 'abroad' }), [1, 2, 3]);
    assert.deepEqual(visibleQuestions({ ...EMPTY, q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign' }), [1, 2, 3, 4]);
    assert.deepEqual(visibleQuestions({ ...EMPTY, q1_shoot_in_vn: false }), [1, 4]);
  });

  test('SC-02 #7: changing question 1 to No clears questions 2 and 3', async () => {
    const { setAnswer } = await load();
    const next = setAnswer({ q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', q4_needs: ['crew'] }, 'q1_shoot_in_vn', false);
    assert.deepEqual(next, { q1_shoot_in_vn: false, q2_release: null, q3_producer: null, q4_needs: ['crew'] });
  });

  test('SC-02 Empty / spec §3: the result appears (and is stored) only when the required answers are complete', async () => {
    const { isComplete } = await load();
    assert.equal(isComplete(EMPTY), false);
    assert.equal(isComplete({ ...EMPTY, q1_shoot_in_vn: true, q2_release: 'abroad' }), false, 'left after question 2: nothing stored');
    assert.equal(isComplete({ ...EMPTY, q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign' }), true);
    assert.equal(isComplete({ ...EMPTY, q1_shoot_in_vn: false }), true);
  });

  test('SC-02 #9 / SR-033: the reason names the questions that decided the result', async () => {
    const { reasonText } = await load();
    assert.equal(reasonText(fakeT, [1, 2, 3]), 'router.reason.many:{"list":"1, 2","last":3}');
    assert.equal(reasonText(fakeT, [1]), 'router.reason.one:{"n":1}');
    assert.equal(reasonText(fakeT, []), null);
  });

  test('SC-02 #12 / Error state: the other two cards, or all three when nothing matched', async () => {
    const { otherCards } = await load();
    assert.deepEqual(otherCards('A'), ['B', 'C']);
    assert.deepEqual(otherCards('C'), ['A', 'B']);
    assert.deepEqual(otherCards(null), ['A', 'B', 'C']);
  });

  test('D4: confirming sends a guest to sign-up and back to the router; a member gets a note instead', async () => {
    const { confirmAction } = await load();
    assert.deepEqual(confirmAction({ signedIn: false }), { href: '/signup?next=%2Fstart' });
    assert.deepEqual(confirmAction({ signedIn: true }), { note: 'router.member_note' });
  });

  test('Spec §3: answers in progress stay in the browser session only, and the page works when storage is blocked', async () => {
    const { saveAnswers, loadAnswers } = await load();
    const memory = new Map();
    const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
    const answers = { ...EMPTY, q1_shoot_in_vn: true, q2_release: 'both' };
    saveAnswers(storage, answers);
    assert.deepEqual(loadAnswers(storage), answers);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    assert.doesNotThrow(() => saveAnswers(blocked, answers));
    assert.deepEqual(loadAnswers(blocked), EMPTY);
    assert.deepEqual(loadAnswers({ getItem: () => '{not json', setItem() {} }), EMPTY);
  });
});
