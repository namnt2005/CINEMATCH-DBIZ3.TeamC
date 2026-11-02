import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migration } from './migration-helpers.js';

function fn(sql, name) {
  const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\(([^)]*)\\)([\\s\\S]*?)\\$\\$([\\s\\S]*?)\\$\\$`));
  return m ? { args: m[1], header: m[2], body: m[3] } : null;
}

const AUDITED = {
  app_admin_save_location: ['location.create', 'location.update', 'location.availability'],
  app_admin_save_contact: ['location.update'],
  app_admin_verify_contact: ['location.contact_verify'],
  app_admin_publish_location: ['location.publish'],
  app_admin_unpublish_location: ['location.unpublish'],
  app_grant_role: ['role.grant'],
  app_deactivate_my_account: ['account.deactivate']
};

describe('Database rules and functions (T015, BR-002, BR-005, M3 BR-004, M10 BR-005, research R4, R12)', () => {
  test('M3 BR-004 / M10 BR-005: the PostgreSQL triggers keep the local names and messages', () => {
    const sql = migration('rules');
    const local = fs.readFileSync('lib/db/local-triggers.sql', 'utf8');
    for (const message of ['Authority contact not verified (M3 BR-004).', 'Audit records are append-only (M10 BR-005).']) {
      assert.ok(local.includes(message));
      assert.ok(sql.includes(message), message);
    }
    assert.match(sql, /CREATE TRIGGER trg_location_publish_needs_contact\b/);
    assert.match(sql, /CREATE TRIGGER trg_audit_log_append_only\b/);
  });

  test('R4: every write function checks the role first and writes its audit row in the same function', () => {
    const sql = migration('rules');
    for (const [name, actions] of Object.entries(AUDITED)) {
      const f = fn(sql, name);
      assert.ok(f, `${name} exists`);
      assert.match(f.header, /SECURITY DEFINER/, `${name} SECURITY DEFINER`);
      assert.match(f.header, /SET search_path = ''/, `${name} pins search_path`);
      assert.match(f.body, /app\.has_role\(|auth\.uid\(\)/, `${name} checks who calls`);
      assert.match(f.body, /INSERT INTO public\.audit_log/, `${name} writes audit`);
      for (const action of actions) assert.ok(f.body.includes(`'${action}'`), `${name} audits ${action}`);
    }
  });

  test('BR-002: only an admin can grant a role, and the grant is audited', () => {
    const f = fn(migration('rules'), 'app_grant_role');
    assert.match(f.body, /app\.has_role\('admin'\)/);
    assert.match(f.body, /RAISE[\s\S]*42501/, 'others get forbidden');
  });

  test('BR-005: deactivation is at once and never deletes; anonymisation replaces name and email', () => {
    const sql = migration('rules');
    const deactivate = fn(sql, 'app_deactivate_my_account');
    assert.match(deactivate.body, /account_status = 'deactivated'/);
    assert.doesNotMatch(sql, /\bDELETE FROM public\./i);
    const anonymise = fn(sql, 'app_anonymise_deactivated');
    assert.ok(anonymise, 'app_anonymise_deactivated exists');
    assert.match(anonymise.body, /UPDATE public\.profile[\s\S]*full_name/);
    assert.match(anonymise.body, /UPDATE public\.user_account[\s\S]*email/);
  });

  test('R4: the write functions are annotated as the RPC route of their table for the coverage test', () => {
    const sql = migration('rules');
    assert.match(sql, /^-- rpc: location (insert|update) app_admin_save_location$/m);
    assert.match(sql, /^-- rpc: authority_contact (insert|update) app_admin_save_contact$/m);
    assert.match(sql, /^-- rpc: user_account update app_grant_role$/m);
  });
});
