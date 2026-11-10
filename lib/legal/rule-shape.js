// Shared shapes of the rule base for both data sources (SC-37).
const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? JSON.parse(v) : []);
const truthy = (v) => v === true || v === 1 || v === '1' || v === 'true';

export const asRule = (r) => r && ({ ...r, revision: Number(r.revision), is_active: truthy(r.is_active), is_sample: truthy(r.is_sample),
  keywords_vi: list(r.keywords_vi), keywords_en: list(r.keywords_en), segments: list(r.segments) });

/** The latest revision per code, with a flag when a draft revision exists, filtered and counted (FR-001). */
export function latestPerCode(rows, { topic = null, status = null } = {}) {
  const byCode = new Map();
  for (const r of rows.map(asRule)) {
    const cur = byCode.get(r.rule_code);
    if (!cur || r.revision > cur.revision) byCode.set(r.rule_code, r);
  }
  const drafts = new Set(rows.filter(r => r.status === 'draft').map(r => r.rule_code));
  const latest = [...byCode.values()].map(r => ({ ...r, has_draft: drafts.has(r.rule_code) })).sort((a, b) => a.rule_code.localeCompare(b.rule_code));
  const counts = { draft: 0, approved: 0, retired: 0 };
  for (const r of latest) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return { counts, rules: latest.filter(r => (!topic || r.topic === topic) && (!status || r.status === status)) };
}

/** Version history (#22): newest first, with the codes signed and retired in each version. */
export function versionHistory(versions, rules) {
  return [...versions].sort((a, b) => (a.rule_version < b.rule_version ? 1 : -1)).map(v => ({
    rule_version: v.rule_version, created_at: v.created_at, created_by: v.created_by,
    signed: rules.filter(r => r.rule_version === v.rule_version).map(r => r.rule_code).sort(),
    retired: rules.filter(r => r.retired_version === v.rule_version).map(r => r.rule_code).sort()
  }));
}

/** Q3: the owners to notify — one per non-archived project whose latest content check used an older version. */
export function ownersToNotify(projects, members, runs, version) {
  const latest = new Map();
  for (const r of [...runs].sort((a, b) => (a.run_at < b.run_at ? -1 : a.run_at > b.run_at ? 1 : String(a.run_id) < String(b.run_id) ? -1 : 1))) latest.set(r.project_id, r);
  return projects.filter(p => (p.stage ?? '') !== 'archived' && latest.get(p.project_id) && latest.get(p.project_id).rule_version < version)
    .flatMap(p => members.filter(m => m.project_id === p.project_id && m.permission === 'owner' && m.user_id).map(m => ({ user_id: m.user_id, project: p.project_name })));
}
