import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateAndMapAttributes } from '../../lib/catalog/validator.js';

describe('Catalog Validator & Synonym Mapper (US-1 Scenario 1.3, F-M3-12)', () => {
  test('maps uncatalogued word "fishing village" to nearest catalog value "floating_village" with explanation', () => {
    const rawAttributes = {
      scene_types: ['fishing village', 'karst']
    };

    const result = validateAndMapAttributes(rawAttributes);

    assert.ok(result.valid_attributes.scene_types.includes('floating_village'));
    assert.ok(result.valid_attributes.scene_types.includes('karst'));
    assert.ok(Array.isArray(result.mapped_explanations));
    assert.ok(
      result.mapped_explanations.some(e => e.original === 'fishing village' && e.mapped === 'floating_village')
    );
  });

  test('drops invalid attribute values not in catalog or synonym taxonomy', () => {
    const rawAttributes = {
      scene_types: ['spaceship', 'alien_planet']
    };

    const result = validateAndMapAttributes(rawAttributes);

    assert.equal(result.valid_attributes.scene_types.length, 0);
    assert.ok(result.rejected.includes('spaceship'));
    assert.ok(result.rejected.includes('alien_planet'));
  });
});
