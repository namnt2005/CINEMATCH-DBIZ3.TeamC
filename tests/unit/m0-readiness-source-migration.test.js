import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// H1 on databases pushed before 05/11/2026: the readiness_source table and the re-created view
const FILE = path.join('supabase', 'migrations', '20261105000100_m0_readiness_source.sql');
const read = () => {
  if (!fs.existsSync(FILE)) throw new Error(`Missing migration ${FILE}`);
  return fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');
};

describe('Migration 20261105000100_m0_readiness_source.sql (H1, BR-001, RLS)', () => {
  test('H1: creates readiness_source as data/schema declares it, with the four seed rows', () => {
    const sql = read();
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.readiness_source/);
    assert.match(sql, /CONSTRAINT ck_readiness_source_gauge CHECK \(gauge IN \('content', 'locations', 'partners', 'dossier'\)\)/);
    assert.match(sql, /INSERT INTO public\.readiness_source[\s\S]*ON CONFLICT \(gauge\) DO NOTHING/);
  });

  test('RLS: Row Level Security on, no grant to anon or authenticated (System only, like segment_rule)', () => {
    const sql = read();
    assert.match(sql, /ALTER TABLE public\.readiness_source ENABLE ROW LEVEL SECURITY;/);
    assert.match(sql, /REVOKE ALL ON public\.readiness_source FROM anon, authenticated;/);
    assert.doesNotMatch(sql, /GRANT[^;]*readiness_source[^;]*TO (anon|authenticated)/);
  });

  test('BR-001: drops and re-creates both views from the rendering, and grants SELECT on the member view again', async () => {
    const sql = read();
    const { renderView } = await import('../../lib/readiness/render-view.js');
    assert.match(sql, /DROP VIEW IF EXISTS public\.v_project_readiness;[\s\S]*DROP VIEW IF EXISTS app\.project_readiness;/);
    assert.ok(sql.includes(renderView('postgres').trim()));
    assert.match(sql, /GRANT SELECT ON public\.v_project_readiness TO authenticated;/);
    assert.doesNotMatch(sql, /\bDELETE\b/i);
  });

  test('FR-008, H1: the snapshot function skips a project whose overall score is not calculated', () => {
    const sql = read();
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.app_snapshot_readiness\(p_date date\)[\s\S]*readiness_total IS NOT NULL/);
  });
});
