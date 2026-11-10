import { userDb, systemDb, rows } from './util.js';
import { CheckError, rpcResult } from '../../checks/errors.js';
import { validateRule } from '../../legal/input.js';
import { latestPerCode, versionHistory, ownersToNotify, asRule } from '../../legal/rule-shape.js';
import { notify } from './notifications.js';

// Supabase source of the rule base: reads as the user (vfda_legal and admin see every revision through RLS), writes
// through the functions, which check the role again (D9) and write the audit rows. Q3 notifications by the System actor.

const legalOnly = (session) => {
  if (!session?.isAuthenticated || !session.userId) throw new CheckError('UNAUTHENTICATED');
  if (session.role !== 'vfda_legal') throw new CheckError('FORBIDDEN');
};
const reader = (session) => {
  if (!session?.isAuthenticated || !session.userId) throw new CheckError('UNAUTHENTICATED');
  if (!['vfda_legal', 'admin'].includes(session.role)) throw new CheckError('FORBIDDEN');
};

export async function listRules(session, filters = {}) {
  reader(session);
  const db = await userDb();
  const all = rows(await db.from('legal_rule').select('*')) || [];
  const versions = rows(await db.from('rule_set_version').select('rule_version').order('rule_version', { ascending: false }).limit(1)) || [];
  const { counts, rules } = latestPerCode(all, filters);
  return { rule_version: versions[0]?.rule_version ?? null, counts, rules };
}

export async function getRule(session, ruleId) {
  reader(session);
  const db = await userDb();
  const rule = asRule(rows(await db.from('legal_rule').select('*').eq('rule_id', ruleId).maybeSingle()));
  if (!rule) throw new CheckError('NOT_FOUND');
  const revisions = rows(await db.from('legal_rule').select('rule_id, revision, status, rule_version, retired_version').eq('rule_code', rule.rule_code)) || [];
  return { ...rule, author: null, edited_at: null, revisions: revisions.sort((a, b) => a.revision - b.revision) };
}

export async function saveDraft(session, ruleId, fields) {
  legalOnly(session);
  const checked = validateRule(fields, { create: !ruleId });
  if (!checked.ok) throw new CheckError('VALIDATION_ERROR', checked.errors);
  const db = await userDb();
  return rpcResult(await db.rpc('app_save_rule_draft', { p_rule_id: ruleId ?? null, p_fields: checked.value }));
}

export async function reviseRule(session, ruleId) {
  legalOnly(session);
  const db = await userDb();
  return rpcResult(await db.rpc('app_revise_rule', { p_rule_id: ruleId }));
}

async function notifyOwners(version) {
  const system = await systemDb();
  const [projects, members, runs] = await Promise.all([
    system.from('project').select('project_id, project_name, stage'), system.from('project_member').select('project_id, user_id, permission'),
    system.from('compliance_run').select('run_id, project_id, rule_version, run_at')
  ]);
  for (const t of ownersToNotify(rows(projects) || [], rows(members) || [], rows(runs) || [], version)) {
    await notify({ recipientId: t.user_id, eventType: 'rule_set.new_version', payload: { rule_version: version, project: t.project } });
  }
}

export async function signRule(session, ruleId) {
  legalOnly(session);
  const db = await userDb();
  const out = rpcResult(await db.rpc('app_sign_rule', { p_rule_id: ruleId }));
  await notifyOwners(out.rule_version);
  return out;
}

export async function retireRule(session, ruleId) {
  legalOnly(session);
  const db = await userDb();
  const out = rpcResult(await db.rpc('app_retire_rule', { p_rule_id: ruleId }));
  await notifyOwners(out.rule_version);
  return out;
}

export async function listVersions(session) {
  reader(session);
  const db = await userDb();
  const [versions, rules] = await Promise.all([db.from('rule_set_version').select('*'), db.from('legal_rule').select('rule_code, rule_version, retired_version')]);
  return { versions: versionHistory(rows(versions) || [], rows(rules) || []) };
}
