import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

let instance = null;

/**
 * Robust CSV parser that handles quotes, commas, and newlines.
 */
function parseCsv(content) {
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
  if (instance) return instance;

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

  instance = db;
  return instance;
}

export function getDb() {
  if (!instance) {
    return initDatabase();
  }
  return instance;
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
  if (instance) {
    instance.close();
    instance = null;
  }
}
