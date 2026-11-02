import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { migration, allMigrations } from './migration-helpers.js';

describe('Search indexes as physical design (T016, FR-010, D9, research R13; FR-011 deferred)', () => {
  test('FR-010: unaccent with an IMMUTABLE wrapper usable in an index', () => {
    const sql = migration('search');
    assert.match(sql, /CREATE EXTENSION IF NOT EXISTS unaccent/);
    assert.match(sql, /CREATE OR REPLACE FUNCTION app\.f_unaccent\(text\)[\s\S]*IMMUTABLE/);
  });

  test('FR-010: GIN text indexes over location names and descriptions, and partner capability descriptions', () => {
    const sql = migration('search');
    assert.match(sql, /ON public\.location USING gin[\s\S]*?name_vi[\s\S]*?name_en[\s\S]*?desc_vi[\s\S]*?desc_en/);
    assert.match(sql, /ON public\.organisation_member_layer USING gin[\s\S]*?capability_desc_vi[\s\S]*?capability_desc_en/);
  });

  test('FR-011 deferred (SYS open question 3): no vector extension, embedding column, HNSW index or match RPC', () => {
    const sql = migration('search').replace(/^--.*$/gm, '');
    assert.doesNotMatch(sql, /CREATE EXTENSION[^;]*\bvector\b/i);
    assert.doesNotMatch(sql, /\bembedding\b/i);
    assert.doesNotMatch(sql, /\bhnsw\b/i);
    assert.doesNotMatch(sql, /app_match_locations/);
  });

  test('FR-010: the search RPC returns published locations only', () => {
    const m = migration('search').match(/CREATE OR REPLACE FUNCTION public\.app_search_locations[\s\S]*?\$\$([\s\S]*?)\$\$/);
    assert.ok(m, 'app_search_locations exists');
    assert.match(m[1], /intake_status = 'published'/);
  });

  test('every SET search_path naming several schemas is unquoted (a quoted list is one schema name)', () => {
    const paths = [...allMigrations().matchAll(/SET search_path\s*(?:=|TO)\s*([^\n]+)/gi)].map(m => m[1].trim());
    assert.ok(paths.length > 0);
    for (const value of paths) {
      assert.doesNotMatch(value, /^'[^']*,[^']*'/, `quoted schema list: ${value}`);
    }
  });

  test('D9: the schema migration generated from data/ has no embedding column (it stays physical design)', () => {
    assert.doesNotMatch(migration('schema'), /embedding/i);
  });
});
