import { systemDb, rows } from './util.js';
import { listFrom, detailFrom, validateFilters } from '../../requirements/shape.js';

// Supabase source of the requirements library. Read by the System on the server, because a guest (anon) reads no
// rule_set_version row and no retired revision (T016); only approved and retired revisions are fetched, never a draft,
// and only public columns leave the server (lib/requirements/shape.js).
async function readable(slug = null) {
  const db = await systemDb();
  let q = db.from('legal_rule').select('*').in('status', ['approved', 'retired']);
  if (slug) q = q.eq('rule_slug', slug);
  const [rules, versions] = await Promise.all([q, db.from('rule_set_version').select('rule_version, created_at')]);
  return { rules: rows(rules) || [], versions: rows(versions) || [] };
}

export async function listRequirements(filters = {}) {
  validateFilters(filters);
  const { rules, versions } = await readable();
  return listFrom(rules, versions, filters);
}

export async function getRequirement(slug) {
  const { rules, versions } = await readable();
  return detailFrom(rules, versions, slug);
}
