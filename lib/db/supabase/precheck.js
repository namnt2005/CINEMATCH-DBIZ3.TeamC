import { systemDb, rows } from './util.js';
import { CheckError, rpcResult } from '../../checks/errors.js';
import { precheckAnswer, asRule } from '../../content-check/pipeline.js';
import { advancedAvailable } from '../../content-check/matcher.js';

// Supabase source of the pre-check. A guest has no account, so the System actor reads the active rules and records the
// run through app_record_precheck (service_role only), which re-checks every revision and recomputes the level.

export async function activeRules() {
  const db = await systemDb();
  return (rows(await db.from('legal_rule').select('*').eq('status', 'approved').eq('is_active', true)) || []).map(asRule);
}
export async function currentVersion() {
  const db = await systemDb();
  return (rows(await db.from('rule_set_version').select('rule_version').order('rule_version', { ascending: false }).limit(1)) || [])[0]?.rule_version ?? null;
}

export async function recordPrecheck(rec) {
  const db = await systemDb();
  return rpcResult(await db.rpc('app_record_precheck', {
    p_hash: rec.hash, p_lang: rec.lang, p_flags: rec.flags ?? null, p_country: rec.country ?? null, p_rule_version: rec.rule_version,
    p_project_id: rec.project_id ?? null, p_findings: rec.findings ?? [], p_dropped_count: rec.dropped_count ?? 0, p_dropped_rule_codes: rec.dropped_rule_codes ?? []
  }));
}

export async function runPrecheck(session, input, { env = process.env, client, timeoutMs, keywordMatcher, country = null } = {}) {
  const [rules, version] = await Promise.all([activeRules(), currentVersion()]);
  const { answer, record } = await precheckAnswer(input, { rules, version }, { env, client, timeoutMs, keywordMatcher });
  const briefId = await recordPrecheck({ ...record, country, project_id: null });
  return { brief_id: briefId, ...answer };
}

export async function getPrecheck(briefId) {
  const db = await systemDb();
  const run = rows(await db.from('precheck_run').select('brief_id, rule_version, lang, attention_level, dropped_count, created_at').eq('brief_id', briefId).maybeSingle());
  if (!run) throw new CheckError('NOT_FOUND');
  const found = rows(await db.from('precheck_finding').select('rule_id, span_start, span_end').eq('brief_id', briefId)) || [];
  const ids = [...new Set(found.map(f => f.rule_id))];
  const rules = ids.length ? rows(await db.from('legal_rule').select('rule_id, rule_code, revision, severity, title_vi, title_en, citation, description_vi, description_en, guidance_vi, guidance_en, is_sample').in('rule_id', ids)) || [] : [];
  const byId = Object.fromEntries(rules.map(r => [r.rule_id, r]));
  const findings = found.sort((a, b) => a.span_start - b.span_start).map((f, i) => {
    const { rule_id: _id, ...rule } = byId[f.rule_id] ?? {};
    return { n: i + 1, span_start: f.span_start, span_end: f.span_end, ...rule };
  });
  return { ...run, dropped_count: Number(run.dropped_count ?? 0), counts: { action: findings.filter(f => f.severity === 'action').length, notice: findings.filter(f => f.severity === 'notice').length }, findings };
}

export async function precheckBasis({ env = process.env } = {}) {
  const [rules, version] = await Promise.all([activeRules(), currentVersion()]);
  return { rule_version: version, approved_count: rules.length, advanced_available: advancedAvailable(env) };
}
