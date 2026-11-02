// Database side of the seed loader (specs/003-sys-core research R7). Takes a connected pg client, so the
// tests pass a fake one. The connection string is only used to mask it out of error messages.
import { maskUrl } from './seed-plan.mjs';

/** Removes the connection string and its password from a message (Constitution IV). */
export function maskSecrets(text, url) {
  let out = String(text ?? '');
  if (!url) return out;
  out = out.split(url).join(maskUrl(url));
  try {
    const password = decodeURIComponent(new URL(url).password || '');
    if (password) out = out.split(password).join('***');
  } catch {
    // not a URL: nothing more to mask
  }
  return out;
}

/** Auth accounts (for the re-key) and whether the application tables already hold data. */
export async function readDatabaseState(client) {
  const { rows: authUsers } = await client.query('select id::text as id, email from auth.users');
  const { rows: [counts] } = await client.query(
    'select (select count(*) from public.location) as locations, (select count(*) from public.user_account) as accounts');
  // Any account row counts: accounts made with "Add user" get re-keyed seed rows with the same id, so --reset is needed
  const databaseHasData = Number(counts?.locations || 0) > 0 || Number(counts?.accounts || 0) > 0;
  return { authUsers: authUsers.map(({ id, email }) => ({ id, email })), databaseHasData };
}

/**
 * Runs the BEGIN … COMMIT block of buildSeedSql in ONE parameterless query: pg then uses the simple query
 * protocol, which accepts several statements. On error the transaction is rolled back and the message masked.
 */
export async function loadSeed(client, sql, url) {
  try {
    await client.query(sql);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // the connection is gone: the server has already dropped the transaction
    }
    throw new Error(`Seed load failed and was rolled back: ${maskSecrets(err.message, url)}`);
  }
}
