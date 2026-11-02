// Pure parts of the seed loader (specs/003-sys-core research R7, decision D3). No I/O here, so they are tested offline.

/** postgresql://user:password@host… → postgresql://***@host… */
export function maskUrl(url) {
  return String(url || '').replace(/^(\w+:\/\/)[^@/]*@/, '$1***@');
}

function projectRefOf(url) {
  try {
    const u = new URL(url);
    const fromUser = decodeURIComponent(u.username).match(/^postgres\.([a-z0-9]{20})$/);
    if (fromUser) return fromUser[1];
    const fromHost = u.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/);
    return fromHost ? fromHost[1] : null;
  } catch {
    return null;
  }
}

/**
 * Only the linked cinematch-dev project may be seeded, unless force (research R7).
 * Never returns the password: messages carry the masked URL only.
 */
export function guardDatabaseUrl(url, { projectRef, projectName, force = false } = {}) {
  const masked = maskUrl(url);
  if (!url) return { ok: false, ref: null, masked, reason: 'SUPABASE_DB_URL is not set. Export it in this terminal (never in a file).' };
  const ref = projectRefOf(url);
  if (force) return { ok: true, ref, masked, reason: 'forced' };
  if (projectName !== 'cinematch-dev') {
    return { ok: false, ref, masked, reason: `The linked project is "${projectName}", not cinematch-dev (supabase/.temp/linked-project.json).` };
  }
  if (!ref || ref !== projectRef) {
    return { ok: false, ref, masked, reason: `${masked} is not the linked cinematch-dev project (${projectRef}). Use --force to override.` };
  }
  return { ok: true, ref, masked, reason: 'cinematch-dev' };
}

/** user_account.user_id and every column that references it (D3). */
export function userReferenceColumns(schemaSql) {
  const columns = [{ table: 'user_account', column: 'user_id' }];
  for (const [, table, body] of schemaSql.matchAll(/CREATE TABLE (\w+) \(\n([\s\S]*?)\n\);/g)) {
    for (const [, column] of body.matchAll(/FOREIGN KEY \((\w+)\) REFERENCES user_account \(user_id\)/g)) {
      columns.push({ table, column });
    }
  }
  return columns;
}

/**
 * Seed accounts whose email already exists in Supabase Auth take the Auth id in every user-id column,
 * and keep their seed role (that is how test accounts made with "Add user" get vfda_staff, partner…).
 * @param {{ table: string, columns: string[], rows: string[][] }[]} tables
 * @param {{ id: string, email: string }[]} authUsers
 */
export function rekeySeed(tables, authUsers, userColumns) {
  const authByEmail = new Map(authUsers.map(u => [String(u.email).toLowerCase(), u.id]));
  const accounts = tables.find(t => t.table === 'user_account');
  const idMap = new Map();
  const rekeyed = [];
  if (accounts) {
    const [idI, emailI, roleI] = ['user_id', 'email', 'role'].map(c => accounts.columns.indexOf(c));
    for (const row of accounts.rows) {
      const authId = authByEmail.get(String(row[emailI]).toLowerCase());
      if (authId && authId !== row[idI]) {
        idMap.set(row[idI], authId);
        rekeyed.push({ email: row[emailI], from: row[idI], to: authId, role: row[roleI] });
      }
    }
  }
  const byTable = new Map();
  for (const { table, column } of userColumns) byTable.set(table, [...(byTable.get(table) || []), column]);

  const out = tables.map(t => {
    const idx = (byTable.get(t.table) || []).map(c => t.columns.indexOf(c)).filter(i => i >= 0);
    if (idx.length === 0 || idMap.size === 0) return t;
    return { ...t, rows: t.rows.map(r => r.map((v, i) => (idx.includes(i) && idMap.has(v) ? idMap.get(v) : v))) };
  });
  return { tables: out, rekeyed };
}

const literal = (v) => (v === '' || v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

/** One transaction that loads the seed; refuses a database with data unless reset (research R7). */
export function buildSeedSql({ tables, reset, databaseHasData }) {
  if (databaseHasData && !reset) {
    throw new Error('The database already has data. Run again with --reset to truncate the application tables first.');
  }
  const out = ['BEGIN;'];
  if (reset) out.push(`TRUNCATE ${tables.map(t => `public.${t.table}`).join(', ')};`);
  out.push('ALTER TABLE public.location DISABLE TRIGGER trg_location_publish_needs_contact;');
  for (const t of tables) {
    if (t.rows.length === 0) continue;
    const values = t.rows.map(r => `(${r.map(literal).join(', ')})`).join(',\n  ');
    out.push(`INSERT INTO public.${t.table} (${t.columns.join(', ')}) VALUES\n  ${values};`);
  }
  out.push('ALTER TABLE public.location ENABLE TRIGGER trg_location_publish_needs_contact;');
  out.push('COMMIT;');
  return out.join('\n');
}
