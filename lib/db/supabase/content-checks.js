import { userDb, systemDb, rows } from './util.js';
import { CheckError, rpcResult } from '../../checks/errors.js';
import { verifySaved, validateNote } from '../../content-check/save.js';
import { activeRules, currentVersion } from './precheck.js';

// Supabase source of the project content check: the findings are verified here first (no RPC for a forged quote), then
// app_save_content_check checks them again with the text, permission, archived state and current version.

export async function saveContentCheck(session, projectId, { text, lang, rule_version: version, findings }) {
  if (!session?.isAuthenticated || !session.userId) throw new CheckError('UNAUTHENTICATED');
  const { kept } = verifySaved({ text, lang, findings }, await activeRules());
  const db = await userDb();
  return rpcResult(await db.rpc('app_save_content_check', {
    p_project_id: projectId, p_rule_version: version, p_lang: lang, p_text: text,
    p_findings: kept.map(f => ({ rule_id: f.rule_id, quoted_text: f.quoted_text }))
  }));
}

export async function latestContentCheck(session, projectId) {
  if (!session?.isAuthenticated || !session.userId) throw new CheckError('UNAUTHENTICATED');
  const db = await userDb();
  const member = rows(await db.from('project_member').select('permission').eq('project_id', projectId).eq('user_id', session.userId).maybeSingle());
  if (!member) throw new CheckError('NOT_FOUND');
  const run = (rows(await db.from('compliance_run').select('run_id, rule_version, run_at').eq('project_id', projectId).order('run_at', { ascending: false }).limit(1)) || [])[0];
  if (!run) return { run_id: null, findings: [] };
  const found = rows(await db.from('compliance_finding').select('finding_id, rule_id, quoted_text, finding_status, reviewer_note').eq('run_id', run.run_id)) || [];
  const system = await systemDb();
  const ids = [...new Set(found.map(f => f.rule_id))];
  const rules = ids.length ? rows(await system.from('legal_rule').select('rule_id, rule_code, revision, severity, title_vi, title_en, citation, description_vi, description_en, guidance_vi, guidance_en, is_sample').in('rule_id', ids)) || [] : [];
  const byId = Object.fromEntries(rules.map(r => [r.rule_id, r]));
  const findings = found.map(f => { const { rule_id: _r, ...rule } = byId[f.rule_id] ?? {}; const { rule_id: _x, ...rest } = f; return { ...rest, ...rule }; })
    .sort((a, b) => String(a.rule_code).localeCompare(String(b.rule_code))).map((f, i) => ({ n: i + 1, ...f }));
  return { ...run, current: run.rule_version === (await currentVersion()), findings };
}

export async function reviewFinding(session, findingId, { note } = {}) {
  const clean = validateNote(note);
  if (!session?.isAuthenticated || !session.userId) throw new CheckError('UNAUTHENTICATED');
  const db = await userDb();
  return rpcResult(await db.rpc('app_review_finding', { p_finding_id: findingId, p_note: clean }));
}
