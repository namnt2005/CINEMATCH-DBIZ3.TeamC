import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const loadSource = () => import('../../lib/db/source.js');
const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;

describe('Data source selection (T004, D4, contracts/data-layer.contract.md)', () => {
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = saved;
  });

  test('D4: without NEXT_PUBLIC_SUPABASE_URL the data source is node:sqlite', async () => {
    const { dataSource } = await loadSource();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    assert.equal(dataSource(), 'sqlite');
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    assert.equal(dataSource(), 'sqlite');
  });

  test('D4: with NEXT_PUBLIC_SUPABASE_URL the data source is Supabase', async () => {
    const { dataSource } = await loadSource();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    assert.equal(dataSource(), 'supabase');
  });

  test('D1: npm test runs offline — no Supabase URL is set for the test runner', () => {
    assert.ok(!saved, 'npm test must not see NEXT_PUBLIC_SUPABASE_URL (it would need the network)');
  });
});
