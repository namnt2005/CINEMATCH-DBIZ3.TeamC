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
    assert.match(sql, /DROP VIEW IF EXISTS public\.v_project_readiness;[\s\S]*DROP VIEW IF EXISTS app\.project_readiness;/);
    // Changed 09/11/2026 with Nam Tran's approval (M2 plan D18): the M2 migration re-creates the view from a newer template
    // (the Dossier gauge reads v_dossier_check), so this older migration can no longer hold the current rendering. That the
    // newest migration holds it is checked by tests/unit/readiness-render.test.js; here: H1 re-creates both views.
    assert.match(sql, /CREATE VIEW app\.project_readiness AS\s+SELECT\b/);
    assert.match(sql, /CREATE VIEW public\.v_project_readiness AS\s+SELECT \* FROM app\.project_readiness WHERE app\.is_project_member\(project_id\);/);
    assert.match(sql, /GRANT SELECT ON public\.v_project_readiness TO authenticated;/);
    assert.doesNotMatch(sql, /\bDELETE\b/i);
  });

  test('FR-008, H1: the snapshot function skips a project whose overall score is not calculated', () => {
    const sql = read();
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.app_snapshot_readiness\(p_date date\)[\s\S]*readiness_total IS NOT NULL/);
  });
});
