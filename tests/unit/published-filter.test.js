import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchQueryFilter } from '../../lib/db/search.js';

describe('Published Status Query Filtering (BR-008)', () => {
  test('enforces intake_status = "published" and published = true in all consumer search clauses', () => {
    const filter = buildSearchQueryFilter({});

    assert.ok(filter.whereClause.includes("intake_status = 'published'"));
    assert.ok(filter.whereClause.includes("published = 'true'") || filter.whereClause.includes("published = 1"));
  });

  test('never includes awaiting_contact (Mũi Né) or unpublished (Cửa Vạn) in search results', () => {
    const filter = buildSearchQueryFilter({ includeUnpublished: false });
    assert.equal(filter.excludeAwaitingContact, true);
    assert.equal(filter.excludeUnpublished, true);
  });
});
