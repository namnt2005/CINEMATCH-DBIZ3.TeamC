// Rule-set version labels (M2 plan D6, Clarifications Q14): YYYY.MM for the first version of a month in Vietnam time,
// then YYYY.MM.02, .03 …; text order equals time order. The SQL twins are app.next_rule_version() (PostgreSQL) and
// nextRuleVersionSql() (node:sqlite).

const vietnamMonth = (now) => new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 7).replace('-', '.');

export function nextRuleVersion(existing = [], now = new Date()) {
  const base = vietnamMonth(now);
  const n = existing.filter(v => v === base || v.startsWith(`${base}.`)).length;
  return n === 0 ? base : `${base}.${String(n + 1).padStart(2, '0')}`;
}

/** node:sqlite query with the named parameter :now (ISO time); returns one row { label }. */
export function nextRuleVersionSql() {
  return `WITH b AS (SELECT strftime('%Y.%m', :now, '+7 hours') AS base)
SELECT CASE WHEN n = 0 THEN base ELSE base || '.' || printf('%02d', n + 1) END AS label
FROM (SELECT b.base AS base, (SELECT COUNT(*) FROM rule_set_version v WHERE v.rule_version = b.base OR v.rule_version LIKE b.base || '.%') AS n FROM b)`;
}
