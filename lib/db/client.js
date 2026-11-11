import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { renderView } from '../readiness/render-view.js';
import { renderDossierView } from '../dossier/render-view.js';

// One database per process. Kept on globalThis because Next.js can bundle this module more than
// once (one copy per route layer); the admin writes of SC-35 must reach the public routes (decision D1).
const STORE = Symbol.for('cinematch.db');

function current() {
  return globalThis[STORE] || null;
}

/**
 * Robust CSV parser that handles quotes, commas, and newlines.
 */
export function parseCsv(content) {
  const lines = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim() !== '')) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim() !== '')) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Initializes and seeds in-memory SQLite database matching data/schema/load_check.py
 */
export function initDatabase() {
  if (current()) return current();

  const db = new DatabaseSync(':memory:');
  const rootDir = process.cwd();
  const schemaDir = path.join(rootDir, 'data', 'schema');
  const seedDir = path.join(rootDir, 'data', 'seed');

  // 1. Run schema files in order
  const schemaFiles = fs.readdirSync(schemaDir)
    .filter(f => f.startsWith('schema-') && f.endsWith('.sql'))
    .sort();

  for (const file of schemaFiles) {
    const sql = fs.readFileSync(path.join(schemaDir, file), 'utf8');
    db.exec(sql);
  }

  db.exec('PRAGMA foreign_keys = ON;');

  // 2. Load seed files in filename order
  const seedFiles = fs.readdirSync(seedDir)
    .filter(f => /^\d{2}_.*\.csv$/.test(f))
    .sort();

  for (const file of seedFiles) {
    const tableName = file.replace(/^\d+_/, '').replace(/\.csv$/, '');
    const content = fs.readFileSync(path.join(seedDir, file), 'utf8');
    const rows = parseCsv(content);
    if (rows.length <= 1) continue;

    const headers = rows[0].map(h => h.trim());
    const placeholders = headers.map(() => '?').join(', ');
    const insertSql = `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${placeholders})`;
    const stmt = db.prepare(insertSql);

    for (let r = 1; r < rows.length; r++) {
      const values = rows[r].map(v => (v === '' ? null : v));
      stmt.run(...values);
    }
  }

  // 2b. Sample files after the main seed (M2 plan D14: data/seed/samples/<table>_samples.csv, e.g. the sample legal rules)
  const sampleDir = path.join(seedDir, 'samples');
  const sampleFiles = fs.existsSync(sampleDir) ? fs.readdirSync(sampleDir).filter(f => /^[a-z_]+_samples\.csv$/.test(f)).sort() : [];
  for (const file of sampleFiles) {
    const tableName = file.replace(/_samples\.csv$/, '');
    const rows = parseCsv(fs.readFileSync(path.join(sampleDir, file), 'utf8'));
    if (rows.length <= 1) continue;
    const headers = rows[0].map(h => h.trim());
    const stmt = db.prepare(`INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${headers.map(() => '?').join(', ')})`);
    for (let r = 1; r < rows.length; r++) stmt.run(...rows[r].map(v => (v === '' ? null : v)));
  }

  // 3. Local database rules, after the seed (lib/db/local-triggers.sql: M3 BR-004, M10 BR-005)
  db.exec(fs.readFileSync(path.join(rootDir, 'lib', 'db', 'local-triggers.sql'), 'utf8'));

  // 4a. M2's dossier check, read by SC-27 and by the readiness view (M2 BR-005, FR-010)
  db.exec(`CREATE VIEW v_dossier_check AS\n${renderDossierView('sqlite')}`);

  // 4. The readiness view, rendered from the body the Supabase migration also uses (M0 BR-001)
  db.exec(`CREATE VIEW v_project_readiness AS\n${renderView('sqlite')}`);

  globalThis[STORE] = db;
  return db;
}

export function getDb() {
  return current() || initDatabase();
}

/**
 * Runs fn(db) in one transaction: everything it writes, audit row included, is committed together
 * or rolled back together (M10 BR-005). Rethrows the error after the rollback.
 */
export function withTransaction(fn) {
  const db = getDb();
  // Inside an open transaction (a caller's, e.g. a test that rolls everything back) nest with a savepoint instead
  if (db.isTransaction === true) {
    db.exec('SAVEPOINT with_transaction');
    try {
      const result = fn(db);
      db.exec('RELEASE with_transaction');
      return result;
    } catch (err) {
      db.exec('ROLLBACK TO with_transaction');
      db.exec('RELEASE with_transaction');
      throw err;
    }
  }
  db.exec('BEGIN');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function query(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

export function getOne(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

export function closeDatabase() {
  const db = current();
  if (db) {
    db.close();
    globalThis[STORE] = null;
  }
}
