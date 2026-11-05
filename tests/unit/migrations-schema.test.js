import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migration, parseTables, schemaTables } from './migration-helpers.js';

describe('Schema migration generated from data/schema (T012, research R1, Constitution I)', () => {
  test('R1: the 47 tables of data/schema/schema-summary.json are created exactly once', () => {
    const summary = JSON.parse(fs.readFileSync('data/schema/schema-summary.json', 'utf8'));
    const expected = Object.values(summary).reduce((n, m) => n + (m.tables || 0), 0);
    const sql = migration('schema');
    const created = [...sql.matchAll(/CREATE TABLE (?:public\.)?(\w+) \(/g)].map(m => m[1]);

    assert.equal(expected, 47);
    assert.equal(created.length, 47);
    assert.equal(new Set(created).size, 47, 'no table twice');
    assert.deepEqual([...created].sort(), Object.keys(schemaTables()).sort());
  });

  test('R1: every table keeps its columns, types, primary key, unique and CHECK constraints byte-for-byte', () => {
    const source = schemaTables();
    const generated = parseTables(migration('schema'));
    for (const [name, table] of Object.entries(source)) {
      assert.deepEqual(generated[name]?.columns, table.columns, `${name} columns`);
      assert.deepEqual(generated[name]?.constraints, table.constraints, `${name} constraints`);
    }
  });

  test('R1: foreign keys are added after all tables, with their original names (modules reference each other in cycles)', () => {
    const sql = migration('schema');
    const generated = parseTables(sql);
    assert.ok(Object.values(generated).every(t => t.foreignKeys.length === 0), 'no FOREIGN KEY inside CREATE TABLE');

    const lastCreate = sql.lastIndexOf('CREATE TABLE');
    for (const [name, table] of Object.entries(schemaTables())) {
      for (const fk of table.foreignKeys) {
        const [, constraint, body] = fk.match(/^CONSTRAINT (\w+) (FOREIGN KEY .*)$/);
        const statement = `ALTER TABLE public.${name} ADD CONSTRAINT ${constraint} ${body}`;
        const at = sql.indexOf(statement.replace(/REFERENCES (\w+)/, 'REFERENCES public.$1'));
        assert.ok(at > lastCreate, `${constraint} added after the last CREATE TABLE`);
      }
    }
  });
});
