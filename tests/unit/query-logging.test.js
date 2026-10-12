import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAndLogQuery } from '../../lib/db/queries.js';

describe('Query Persistence & PII Exclusion (BR-009)', () => {
  test('persists confirmed search query attributes while strictly stripping personal data', () => {
    const rawSearchData = {
      description: 'Ferry landing at dawn near karst',
      attributes: { scene_types: ['karst', 'river'] },
      shoot_month: 9,
      project_id: null,
      // Potential user personal data leaked in request
      user_email: 'producer@filmcorp.com',
      user_name: 'John Doe',
      ip_address: '192.168.1.1'
    };

    const logged = sanitizeAndLogQuery(rawSearchData);

    assert.ok(logged.query_id);
    assert.equal(logged.description, rawSearchData.description);
    assert.deepEqual(logged.attributes, rawSearchData.attributes);
    assert.equal(logged.month, 9);

    // Verify PII fields are strictly excluded
    assert.equal(logged.user_email, undefined);
    assert.equal(logged.user_name, undefined);
    assert.equal(logged.ip_address, undefined);
  });
});
