// Renders the one body of v_project_readiness (lib/db/readiness-view.sql) for a database (BR-001, research R3).
// The two renderings differ only in the ordered list aggregate; the leading comment block is dropped.
import fs from 'node:fs';
import path from 'node:path';

const TEMPLATE = path.join(process.cwd(), 'lib', 'db', 'readiness-view.sql');
const LIST_AGGREGATE = {
  sqlite: (expr) => `group_concat(${expr}, ',' ORDER BY ${expr})`,
  postgres: (expr) => `string_agg(${expr}, ',' ORDER BY ${expr})`
};

/** The SELECT of the view for 'sqlite' or 'postgres'. */
export function renderView(dialect) {
  const aggregate = LIST_AGGREGATE[dialect];
  if (!aggregate) throw new Error(`Unknown dialect for the readiness view: ${dialect}`);
  const body = fs.readFileSync(TEMPLATE, 'utf8').split('\n').filter(line => !line.startsWith('--')).join('\n');
  return body.replace(/\{\{ordered_list:([\w.]+)\}\}/g, (match, expr) => aggregate(expr)).trim() + '\n';
}
