import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migration, schemaTables } from './migration-helpers.js';

/*
 * Convention the generated grants/RLS migration must follow (tools/build_supabase.py, research R3):
 *   -- policy: <table> <select|insert|update> <role>[,<role>…]   immediately before its CREATE POLICY
 *        roles: anon, signed_in (any active role), member, partner, vfda_staff, vfda_legal, admin
 *   -- rpc: <table> <insert|update> <function>                   write done only by a Postgres function or trigger
 *        (data-model §5, or the auth.users triggers of §2, e.g. app.handle_new_auth_user)
 *   -- deferred: <table> <select|insert|update> <Actor> OQ<n>     no policy until research open question n is answered
 */

const OPS = { C: 'insert', R: 'select', U: 'update' };
// Actor of docs/function-list.md → roles that satisfy it (D5: admin inherits staff and legal through app.has_role)
const ACTOR_ROLES = {
  Guest: ['anon'],
  Member: ['member', 'signed_in'],
  User: ['signed_in'],
  Partner: ['partner', 'signed_in'],
  'VFDA Staff': ['vfda_staff'],
  'VFDA Legal': ['vfda_legal'],
  Admin: ['admin'],
  Province: [] // no role exists: must be deferred (research Open question 1)
};

function actors() {
  const map = {};
  for (const line of fs.readFileSync('docs/function-list.md', 'utf8').split('\n')) {
    const cells = line.split('|').map(c => c.trim());
    if (/^\d+$/.test(cells[1] || '') && cells[3]) map[cells[3]] = cells[7];
  }
  return map;
}

function crudRows() {
  return [...fs.readFileSync('data/02-crud-matrix.md', 'utf8')
    .matchAll(/^\| (F-[A-Z0-9]+-\d+) \| `([A-Z_]+)` \| ([CRUD]+) \|/gm)]
    .map(([, fn, entity, ops]) => ({ fn, table: entity.toLowerCase(), ops: [...ops] }));
}

function annotations(sql) {
  const policies = [...sql.matchAll(/^-- policy: (\w+) (select|insert|update) ([\w,]+)$/gm)]
    .map(([, table, op, roles]) => ({ table, op, roles: roles.split(',') }));
  const rpcs = [...sql.matchAll(/^-- rpc: (\w+) (insert|update) ([\w.]+)$/gm)].map(([, table, op, fn]) => ({ table, op, fn }));
  const deferred = [...sql.matchAll(/^-- deferred: (\w+) (select|insert|update) (.+) OQ(\d+)$/gm)]
    .map(([, table, op, actor, oq]) => ({ table, op, actor: actor.trim(), oq: Number(oq) }));
  return { policies, rpcs, deferred };
}

describe('Grants and Row Level Security on every table (T013, BR-001, FR-004, data-model §3–§4)', () => {
  test('BR-001: Row Level Security is enabled on all 46 tables', () => {
    const sql = migration('grantsRls');
    for (const table of Object.keys(schemaTables())) {
      assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`), table);
    }
  });

  test('BR-005 / M3 BR-008: no DELETE grant and no DELETE or ALL policy for any role', () => {
    const sql = migration('grantsRls');
    assert.doesNotMatch(sql, /GRANT[^;]*\bDELETE\b[^;]*TO\s+(anon|authenticated)/i);
    assert.doesNotMatch(sql, /FOR\s+(DELETE|ALL)\b/i);
    assert.doesNotMatch(sql, /GRANT\s+ALL\b[^;]*TO\s+(anon|authenticated)/i);
  });

  test('data-model §4: everything is revoked first, and anon may only SELECT the five public tables', () => {
    const sql = migration('grantsRls');
    for (const table of Object.keys(schemaTables())) {
      assert.match(sql, new RegExp(`REVOKE ALL ON public\\.${table} FROM anon, authenticated;`), `${table} revoked`);
    }
    const anonTables = [...sql.matchAll(/GRANT SELECT ON public\.(\w+) TO anon\b/g)].map(m => m[1]).sort();
    assert.deepEqual(anonTables, ['legal_rule', 'location', 'location_image', 'organisation', 'province']);
    assert.doesNotMatch(sql, /GRANT (INSERT|UPDATE)[^;]*TO anon\b/);
  });

  test('data-model §4: users may only change notification.read_at and profile name, crew role and locale', () => {
    const sql = migration('grantsRls');
    assert.match(sql, /GRANT UPDATE \(read_at\) ON public\.notification TO authenticated;/);
    assert.match(sql, /GRANT UPDATE \(full_name, crew_role, locale\) ON public\.profile TO authenticated;/);
    assert.doesNotMatch(sql, /GRANT [^;(]*UPDATE[^;(]* ON public\.(notification|profile|user_account) TO authenticated/);
  });

  test('BR-001: every annotated policy has its CREATE POLICY, on the same table and operation', () => {
    const sql = migration('grantsRls');
    const blocks = [...sql.matchAll(/^-- policy: (\w+) (select|insert|update) [\w,]+\nCREATE POLICY \w+ ON public\.(\w+) FOR (SELECT|INSERT|UPDATE)/gm)];
    const { policies } = annotations(sql);
    assert.ok(policies.length > 0, 'policies exist');
    assert.equal(blocks.length, policies.length, 'each annotation is followed by its CREATE POLICY');
    for (const [, table, op, policyTable, policyOp] of blocks) {
      assert.equal(policyTable, table);
      assert.equal(policyOp.toLowerCase(), op);
    }
    assert.equal([...sql.matchAll(/CREATE POLICY/g)].length, policies.length, 'no policy without annotation');
  });

  test('FR-004 / BR-001: every human (entity, operation) of the CRUD matrix is covered by a policy, an RPC or a deferred open question', () => {
    const sql = `${migration('authLink')}\n${migration('grantsRls')}\n${migration('rules')}`;
    const { policies, rpcs, deferred } = annotations(sql);
    const tables = new Set(Object.keys(schemaTables()));
    const actorOf = actors();
    const missing = [];

    for (const { fn, table, ops } of crudRows()) {
      const actor = actorOf[fn];
      if (!tables.has(table) || !actor || actor === 'System') continue; // derived entities; System uses the secret key (D2)
      for (const letter of ops) {
        const op = OPS[letter];
        const wanted = ACTOR_ROLES[actor] || [];
        // An anon policy is created TO anon, authenticated, so it serves every actor; signed_in serves every signed-in actor
        const serves = (r) => wanted.includes(r) || r === 'anon' || (r === 'signed_in' && actor !== 'Guest' && actor !== 'Province');
        const byPolicy = policies.some(p => p.table === table && p.op === op && p.roles.some(serves));
        const byRpc = op !== 'select' && rpcs.some(r => r.table === table && r.op === op);
        const byDeferral = deferred.some(d => d.table === table && d.op === op && d.actor === actor && [1, 13, 14, 15].includes(d.oq));
        if (!byPolicy && !byRpc && !byDeferral) missing.push(`${fn} ${actor} ${letter} ${table}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test('BR-001: authority contacts are readable by signed-in roles and staff only — never by anon', () => {
    const { policies } = annotations(migration('grantsRls'));
    const contactReads = policies.filter(p => p.table === 'authority_contact' && p.op === 'select');
    assert.ok(contactReads.length > 0);
    assert.ok(contactReads.every(p => !p.roles.includes('anon')));
  });
});
