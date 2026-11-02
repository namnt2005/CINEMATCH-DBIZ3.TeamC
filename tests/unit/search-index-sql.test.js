import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { migration } from './migration-helpers.js';

describe('Search indexes as physical design (T016, FR-010, FR-011, D8, D9, research R13–R14)', () => {
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

  test('FR-011 / D8: pgvector, embedding VECTOR(768) on both tables, HNSW cosine indexes', () => {
    const sql = migration('search');
    assert.match(sql, /CREATE EXTENSION IF NOT EXISTS vector/);
    for (const table of ['location', 'organisation_member_layer']) {
      assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ADD COLUMN IF NOT EXISTS embedding (extensions\\.)?vector\\(768\\)`, 'i'));
      assert.match(sql, new RegExp(`ON public\\.${table} USING hnsw \\(embedding (extensions\\.)?vector_cosine_ops\\)`));
    }
  });

  test('FR-010 / FR-011: the search RPCs return published locations only', () => {
    const sql = migration('search');
    for (const name of ['app_search_locations', 'app_match_locations']) {
      const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`));
      assert.ok(m, `${name} exists`);
      assert.match(m[1], /intake_status = 'published'/, `${name} filters published`);
    }
  });

  test('D9: the schema migration generated from data/ has no embedding column (it stays physical design)', () => {
    assert.doesNotMatch(migration('schema'), /embedding/i);
  });
});
