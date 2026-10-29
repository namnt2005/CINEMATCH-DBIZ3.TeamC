import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { getOne, query, closeDatabase } from '../../lib/db/client.js';

describe('Foundational Seed Data Verification (Session 5 Data Package)', () => {
  after(() => {
    closeDatabase();
  });

  test('verifies total location count equals 11 per data/data-model-M3.md', () => {
    const row = getOne('SELECT count(*) as total FROM location');
    assert.equal(row.total, 11, 'Expected exactly 11 locations in seed package');
  });

  test('verifies location breakdown by intake status and published flag', () => {
    const published = getOne("SELECT count(*) as count FROM location WHERE (published = 'true' OR published = 1) AND intake_status = 'published'");
    assert.equal(published.count, 9, 'Expected 9 published locations');

    const awaiting = getOne("SELECT count(*) as count FROM location WHERE (published = 'false' OR published = 0) AND intake_status = 'awaiting_contact'");
    assert.equal(awaiting.count, 1, 'Expected 1 awaiting_contact location (Mũi Né)');

    const unpublished = getOne("SELECT count(*) as count FROM location WHERE (published = 'false' OR published = 0) AND intake_status = 'unpublished'");
    assert.equal(unpublished.count, 1, 'Expected 1 unpublished location (Cửa Vạn)');
  });

  test('verifies province table has 34 reorganized post-2025 units (BR-006)', () => {
    const row = getOne('SELECT count(*) as count FROM province');
    assert.equal(row.count, 34, 'Expected exactly 34 post-2025 provinces');
  });

  test('verifies location images are linked to locations', () => {
    const row = getOne('SELECT count(*) as count FROM location_image');
    assert.ok(row.count > 0, 'Expected location images in seed data');
  });
});
