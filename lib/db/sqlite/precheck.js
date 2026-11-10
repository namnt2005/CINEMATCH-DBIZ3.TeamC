import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam } from '../audit.js';
import { CheckError } from '../../checks/errors.js';
import { precheckAnswer, recordLevel, asRule } from '../../content-check/pipeline.js';
import { advancedAvailable } from '../../content-check/matcher.js';

// node:sqlite source of the pre-check; recordPrecheck is the twin of app_record_precheck (20261108000100_m2_check.sql).

export const activeRules = () => query("SELECT * FROM legal_rule WHERE status = 'approved' AND is_active IN ('true', 1)").map(asRule);
export const currentVersion = () => getOne('SELECT MAX(rule_version) AS v FROM rule_set_version')?.v ?? null;

/** BR-001, BR-007: the revision was signed in or before `version` and not yet retired then. */
export function inForce(ruleId, version) {
  const r = getOne('SELECT rule_version, retired_version, citation, approved_by FROM legal_rule WHERE rule_id = ?', [ruleId]);
  return Boolean(r && r.rule_version && r.rule_version <= version && (!r.retired_version || r.retired_version > version) && r.citation && r.approved_by);
}

export async function recordPrecheck(rec, { now = nowInVietnam() } = {}) {
  const findings = rec.findings ?? [];
  if (!['en', 'vi'].includes(rec.lang) || !rec.rule_version || findings.some(f => !inForce(f.rule_id, rec.rule_version))) {
    throw new CheckError('VALIDATION_ERROR');
  }
  const severities = findings.map(f => getOne('SELECT severity FROM legal_rule WHERE rule_id = ?', [f.rule_id]).severity);
  const level = recordLevel(severities, Number(rec.dropped_count ?? 0));
  const id = randomUUID();
  withTransaction((db) => {
    db.prepare(`INSERT INTO precheck_run (brief_id, project_id, rule_version, synopsis_hash, lang, flags, country_guess, attention_level,
      dropped_count, dropped_rule_codes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, rec.project_id ?? null, rec.rule_version, rec.hash, rec.lang, rec.flags ? JSON.stringify(rec.flags) : null, rec.country ?? null,
        level, Number(rec.dropped_count ?? 0), JSON.stringify(rec.dropped_rule_codes ?? []), now);
    const ins = db.prepare('INSERT INTO precheck_finding (brief_id, rule_id, span_start, span_end) VALUES (?, ?, ?, ?)');
    for (const f of findings) ins.run(id, f.rule_id, f.span_start, f.span_end);
  });
  return id;
}

export async function runPrecheck(session, input, { env = process.env, client, timeoutMs, keywordMatcher, country = null, now } = {}) {
  const { answer, record } = await precheckAnswer(input, { rules: activeRules(), version: currentVersion() }, { env, client, timeoutMs, keywordMatcher });
  const briefId = await recordPrecheck({ ...record, country, project_id: null }, now ? { now } : {});
  return { brief_id: briefId, ...answer };
}

const RULE_COLS = 'r.rule_code, r.revision, r.severity, r.title_vi, r.title_en, r.citation, r.description_vi, r.description_en, r.guidance_vi, r.guidance_en, r.is_sample';

export async function getPrecheck(briefId) {
  const run = getOne('SELECT brief_id, rule_version, lang, attention_level, dropped_count, created_at FROM precheck_run WHERE brief_id = ?', [briefId]);
  if (!run) throw new CheckError('NOT_FOUND');
  const findings = query(`SELECT f.span_start, f.span_end, ${RULE_COLS} FROM precheck_finding f JOIN legal_rule r ON r.rule_id = f.rule_id
    WHERE f.brief_id = ? ORDER BY f.span_start`, [briefId]);
  const shaped = findings.map((f, i) => ({ n: i + 1, ...f, revision: Number(f.revision), is_sample: String(f.is_sample) === 'true' }));
  return { ...run, dropped_count: Number(run.dropped_count ?? 0), counts: { action: shaped.filter(f => f.severity === 'action').length, notice: shaped.filter(f => f.severity === 'notice').length }, findings: shaped };
}

export async function precheckBasis({ env = process.env } = {}) {
  return { rule_version: currentVersion(), approved_count: activeRules().length, advanced_available: advancedAvailable(env) };
}
