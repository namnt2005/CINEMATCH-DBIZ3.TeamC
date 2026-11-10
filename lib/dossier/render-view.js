// Renders the one body of v_dossier_check (lib/db/dossier-view.sql) for a database (M2 BR-005, FR-010, research R8).
// The SQL is portable, so both renderings are the same text without the leading comment block.
import fs from 'node:fs';
import path from 'node:path';

const TEMPLATE = path.join(process.cwd(), 'lib', 'db', 'dossier-view.sql');

export function renderDossierView(dialect) {
  if (!['sqlite', 'postgres'].includes(dialect)) throw new Error(`Unknown dialect for the dossier view: ${dialect}`);
  return fs.readFileSync(TEMPLATE, 'utf8').split('\n').filter(line => !line.startsWith('--')).join('\n').trim() + '\n';
}
