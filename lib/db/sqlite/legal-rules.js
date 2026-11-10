import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam, writeAudit } from '../audit.js';
import { CheckError } from '../../checks/errors.js';
import { validateRule } from '../../legal/input.js';
import { nextRuleVersion } from '../../legal/version.js';
import { latestPerCode, versionHistory, ownersToNotify, asRule } from '../../legal/rule-shape.js';
import { missingForSign } from '../../legal/view.js';
import { notify } from './notifications.js';
import { userOf } from './partner-access.js';

// node:sqlite twins of app_save_rule_draft, app_revise_rule, app_sign_rule, app_retire_rule (20261108000100_m2_check.sql).

const legalOnly = (session) => {
  if (!userOf(session)) throw new CheckError('UNAUTHENTICATED');
  if (session.role !== 'vfda_legal') throw new CheckError('FORBIDDEN');      // D9: admin reads, never signs
};
const reader = (session) => {
  if (!userOf(session)) throw new CheckError('UNAUTHENTICATED');
  if (!['vfda_legal', 'admin'].includes(session.role)) throw new CheckError('FORBIDDEN');
};
const ruleById = (id) => getOne('SELECT * FROM legal_rule WHERE rule_id = ?', [id]);
const json = (v) => (v === undefined || v === null ? null : JSON.stringify(v));

export async function listRules(session, filters = {}) {
  reader(session);
  const { counts, rules } = latestPerCode(query('SELECT * FROM legal_rule'), filters);
  return { rule_version: getOne('SELECT MAX(rule_version) AS v FROM rule_set_version')?.v ?? null, counts, rules };
}

export async function getRule(session, ruleId) {
  reader(session);
  const rule = asRule(ruleById(ruleId));
  if (!rule) throw new CheckError('NOT_FOUND');
  const trail = query("SELECT admin_id, logged_at, action FROM audit_log WHERE target_id = ? AND action LIKE 'rule.%' ORDER BY logged_at", [ruleId]);
  const revisions = query('SELECT rule_id, revision, status, rule_version, retired_version FROM legal_rule WHERE rule_code = ? ORDER BY revision', [rule.rule_code]);
  return { ...rule, author: trail.find(a => a.action === 'rule.save' || a.action === 'rule.revise')?.admin_id ?? null, edited_at: trail.at(-1)?.logged_at ?? null,
    revisions: revisions.map(r => ({ ...r, revision: Number(r.revision) })) };
}

export async function saveDraft(session, ruleId, fields) {
  legalOnly(session);
  const checked = validateRule(fields, { create: !ruleId });
  if (!checked.ok) throw new CheckError('VALIDATION_ERROR', checked.errors);
  const v = checked.value;
  if (!ruleId) {
    if (getOne('SELECT 1 AS x FROM legal_rule WHERE rule_code = ?', [v.rule_code])) throw new CheckError('CODE_EXISTS');
    const id = randomUUID();
    withTransaction((db) => {
      db.prepare(`INSERT INTO legal_rule (rule_id, rule_code, revision, rule_version, title_vi, title_en, description_vi, description_en, guidance_vi, guidance_en,
        citation, severity, topic, rule_slug, status, approved_by, approved_at, is_active, keywords_vi, keywords_en, segments, retired_version, is_sample)
        VALUES (?, ?, 1, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NULL, NULL, 'false', ?, ?, ?, NULL, 'false')`)
        .run(id, v.rule_code, v.title_vi, v.title_en, v.description_vi, v.description_en, v.guidance_vi, v.guidance_en, v.citation ?? null,
          v.severity, v.topic, v.rule_code.toLowerCase(), json(v.keywords_vi), json(v.keywords_en), json(v.segments));
      writeAudit(db, { action: 'rule.save', adminId: session.userId, targetId: id });
    });
    return { rule_id: id, revision: 1, status: 'draft' };
  }
  const rule = ruleById(ruleId);
  if (!rule) throw new CheckError('NOT_FOUND');
  if (rule.status !== 'draft') throw new CheckError('NOT_DRAFT');
  const cols = Object.keys(v);
  withTransaction((db) => {
    if (cols.length) {
      db.prepare(`UPDATE legal_rule SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE rule_id = ?`)
        .run(...cols.map(c => (['keywords_vi', 'keywords_en', 'segments'].includes(c) ? json(v[c]) : v[c])), ruleId);
    }
    writeAudit(db, { action: 'rule.save', adminId: session.userId, targetId: ruleId });
  });
  return { rule_id: ruleId, revision: Number(rule.revision), status: 'draft' };
}

export async function reviseRule(session, ruleId) {
  legalOnly(session);
  const rule = ruleById(ruleId);
  if (!rule) throw new CheckError('NOT_FOUND');
  if (rule.status !== 'approved') throw new CheckError('NOT_APPROVED');
  if (getOne("SELECT 1 AS x FROM legal_rule WHERE rule_code = ? AND status = 'draft'", [rule.rule_code])) throw new CheckError('DRAFT_EXISTS');
  const id = randomUUID();
  const revision = Number(getOne('SELECT MAX(revision) AS r FROM legal_rule WHERE rule_code = ?', [rule.rule_code]).r) + 1;
  withTransaction((db) => {
    db.prepare(`INSERT INTO legal_rule (rule_id, rule_code, revision, rule_version, title_vi, title_en, description_vi, description_en, guidance_vi, guidance_en,
      citation, severity, topic, rule_slug, status, approved_by, approved_at, is_active, keywords_vi, keywords_en, segments, retired_version, is_sample)
      SELECT ?, rule_code, ?, NULL, title_vi, title_en, description_vi, description_en, guidance_vi, guidance_en, citation, severity, topic, rule_slug,
      'draft', NULL, NULL, 'false', keywords_vi, keywords_en, segments, NULL, is_sample FROM legal_rule WHERE rule_id = ?`).run(id, revision, ruleId);
    writeAudit(db, { action: 'rule.revise', adminId: session.userId, targetId: id });
  });
  return { rule_id: id, revision, status: 'draft' };
}

function newVersion(db, session, now) {
  const version = nextRuleVersion(db.prepare('SELECT rule_version FROM rule_set_version').all().map(r => r.rule_version), new Date());
  db.prepare('INSERT INTO rule_set_version (rule_version, created_at, created_by) VALUES (?, ?, ?)').run(version, now, session.userId);
  return version;
}

/** Q3: notify the owners of open projects whose latest content check used an older version; nothing is re-run. */
function notifyOwners(version) {
  const targets = ownersToNotify(query('SELECT project_id, project_name, stage FROM project'), query('SELECT project_id, user_id, permission FROM project_member'),
    query('SELECT run_id, project_id, rule_version, run_at FROM compliance_run'), version);
  for (const t of targets) notify({ recipientId: t.user_id, eventType: 'rule_set.new_version', payload: { rule_version: version, project: t.project } });
}

export async function signRule(session, ruleId, { now = nowInVietnam() } = {}) {
  legalOnly(session);
  const rule = asRule(ruleById(ruleId));
  if (!rule) throw new CheckError('NOT_FOUND');
  if (rule.status !== 'draft') throw new CheckError('NOT_DRAFT');
  const missing = missingForSign(rule).filter(k => k !== 'citation');      // BR-002: the citation is left to the database CHECK
  if (missing.length) throw new CheckError('VALIDATION_ERROR', Object.fromEntries(missing.map(k => [k, 'rules.error.required'])));
  let out;
  try {
    out = withTransaction((db) => {
      const version = newVersion(db, session, now);
      const old = db.prepare("SELECT rule_id FROM legal_rule WHERE rule_code = ? AND status = 'approved'").get(rule.rule_code)?.rule_id ?? null;
      if (old) db.prepare("UPDATE legal_rule SET status = 'retired', is_active = 'false', retired_version = ? WHERE rule_id = ?").run(version, old);
      db.prepare("UPDATE legal_rule SET status = 'approved', is_active = 'true', approved_by = ?, approved_at = ?, rule_version = ? WHERE rule_id = ?")
        .run(session.userId, now, version, ruleId);
      writeAudit(db, { action: 'rule.sign', adminId: session.userId, targetId: ruleId });
      return { rule_version: version, retired_rule_id: old };
    });
  } catch (err) {
    if (/CHECK constraint failed/.test(String(err?.message))) throw new CheckError('CITATION_REQUIRED', { citation: 'rules.error.citation' });
    throw err;
  }
  notifyOwners(out.rule_version);
  return out;
}

export async function retireRule(session, ruleId, { now = nowInVietnam() } = {}) {
  legalOnly(session);
  const rule = ruleById(ruleId);
  if (!rule) throw new CheckError('NOT_FOUND');
  if (rule.status !== 'approved') throw new CheckError('NOT_APPROVED');
  const out = withTransaction((db) => {
    const version = newVersion(db, session, now);
    db.prepare("UPDATE legal_rule SET status = 'retired', is_active = 'false', retired_version = ? WHERE rule_id = ?").run(version, ruleId);
    writeAudit(db, { action: 'rule.retire', adminId: session.userId, targetId: ruleId });
    return { rule_version: version };
  });
  notifyOwners(out.rule_version);
  return out;
}

export async function listVersions(session) {
  reader(session);
  return { versions: versionHistory(query('SELECT * FROM rule_set_version'), query('SELECT rule_code, rule_version, retired_version FROM legal_rule')) };
}
