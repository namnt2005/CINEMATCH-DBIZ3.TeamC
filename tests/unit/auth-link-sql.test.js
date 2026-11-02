import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { migration, allMigrations } from './migration-helpers.js';

function functionBody(sql, name) {
  const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION ${name.replace('.', '\\.')}\\([^)]*\\)[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`));
  return m ? m[1] : null;
}

describe('Link between auth.users and user_account (T014, BR-002, BR-003, BR-004, research R2, R5)', () => {
  test('R2: schema app holds current_role(), has_role() and is_project_member()', () => {
    const sql = migration('authLink');
    assert.match(sql, /CREATE SCHEMA IF NOT EXISTS app;/);
    for (const fn of ['app.current_role', 'app.has_role', 'app.is_project_member']) {
      assert.ok(functionBody(sql, fn), `${fn} exists`);
    }
    const currentRole = functionBody(sql, 'app.current_role');
    assert.match(currentRole, /auth\.uid\(\)/);
    assert.match(currentRole, /account_status/, 'a deactivated account gets no role (BR-005)');
    assert.match(sql, /app\.has_role[\s\S]*'admin'/, 'admin inherits staff and legal (D5)');
  });

  test('BR-002: a new account always gets the literal role member, never a role from the client', () => {
    const sql = migration('authLink');
    assert.match(sql, /CREATE TRIGGER \w+\s+AFTER INSERT ON auth\.users/);
    const body = functionBody(sql, 'app.handle_new_auth_user');
    assert.ok(body, 'app.handle_new_auth_user() exists');
    assert.match(body, /INSERT INTO public\.user_account[\s\S]*'member'/);
    assert.doesNotMatch(body, /raw_user_meta_data\s*->>?\s*'(role|account_status|user_id)'/);
    assert.doesNotMatch(body, /raw_app_meta_data/);
  });

  test('BR-003 / FR-001: with the sign-up metadata the trigger also stores organisation, profile and the consent version with its time', () => {
    const body = functionBody(migration('authLink'), 'app.handle_new_auth_user') || '';
    for (const table of ['producer_organisation', 'profile', 'consent']) {
      assert.match(body, new RegExp(`INSERT INTO public\\.${table}`), table);
    }
    assert.match(body, /consent_version/);
    assert.match(body, /INSERT INTO public\.consent[\s\S]*now\(\)/, 'accepted_at = now()');
    assert.match(body, /IF[\s\S]*full_name[\s\S]*THEN/, 'profile rows only when the metadata is complete (Add user has none)');
  });

  test('R5: email confirmation and email changes are copied to user_account', () => {
    const sql = migration('authLink');
    assert.match(sql, /AFTER UPDATE OF email_confirmed_at, email ON auth\.users/);
    assert.match(sql, /email_verified/);
  });

  test('R2: the helper functions are SECURITY DEFINER with a fixed search_path', () => {
    const sql = migration('authLink');
    const definers = [...sql.matchAll(/SECURITY DEFINER/g)].length;
    const paths = [...sql.matchAll(/SET search_path = ''/g)].length;
    assert.ok(definers >= 2);
    assert.ok(paths >= definers, 'every SECURITY DEFINER function pins search_path');
  });

  test('BR-004: no migration stores a password, a password hash or a token', () => {
    const sql = allMigrations();
    // synopsis_hash (M2, Clarifications Q9) is a content hash, not a credential, so plain *_hash columns are allowed
    assert.doesNotMatch(sql, /^\s+\w*(password|passwd|pwd|token)\w*\s+(TEXT|VARCHAR|CHAR)/im);
  });
});
