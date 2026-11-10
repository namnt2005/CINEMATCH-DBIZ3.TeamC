import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam } from '../audit.js';
import { CheckError } from '../../checks/errors.js';
import { verifySaved, validateNote } from '../../content-check/save.js';
import { userOf, permissionOf } from './partner-access.js';
import { activeRules, currentVersion } from './precheck.js';

// node:sqlite twins of app_save_content_check and app_review_finding (20261108000100_m2_check.sql).

function projectFor(session, projectId, { write = false } = {}) {
  if (!userOf(session)) throw new CheckError('UNAUTHENTICATED');
  const project = getOne('SELECT project_id, stage FROM project WHERE project_id = ?', [projectId]);
  const permission = project ? permissionOf(session, projectId) : null;
  if (!project || !permission) throw new CheckError('NOT_FOUND');
  if (write && !['owner', 'edit'].includes(permission)) throw new CheckError('FORBIDDEN');
  if (write && project.stage === 'archived') throw new CheckError('ARCHIVED');
  return project;
}

export async function saveContentCheck(session, projectId, { text, lang, rule_version: version, findings }, { now = nowInVietnam() } = {}) {
  projectFor(session, projectId, { write: true });
  if (version !== currentVersion()) throw new CheckError('RULE_SET_CHANGED');
  const { kept, hash, level } = verifySaved({ text, lang, findings }, activeRules());
  const runId = randomUUID();
  withTransaction((db) => {
    db.prepare('INSERT INTO compliance_run (run_id, project_id, rule_version, run_at) VALUES (?, ?, ?, ?)').run(runId, projectId, version, now);
    const ins = db.prepare("INSERT INTO compliance_finding (finding_id, run_id, rule_id, quoted_text, finding_status, reviewer_note) VALUES (?, ?, ?, ?, 'open', NULL)");
    for (const f of kept) ins.run(randomUUID(), runId, f.rule_id, f.quoted_text);
    // FR-007: the save is also a demand data point — the hash of the text, never the text
    const briefId = randomUUID();
    db.prepare(`INSERT INTO precheck_run (brief_id, project_id, rule_version, synopsis_hash, lang, flags, country_guess, attention_level,
      dropped_count, dropped_rule_codes, created_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 0, '[]', ?)`).run(briefId, projectId, version, hash, lang, level, now);
    const span = db.prepare('INSERT INTO precheck_finding (brief_id, rule_id, span_start, span_end) VALUES (?, ?, ?, ?)');
    for (const f of kept) span.run(briefId, f.rule_id, f.span_start, f.span_end);
  });
  return { run_id: runId, rule_version: version, findings: kept.length };
}

const RULE_COLS = 'r.rule_code, r.revision, r.severity, r.title_vi, r.title_en, r.citation, r.description_vi, r.description_en, r.guidance_vi, r.guidance_en, r.is_sample';

export async function latestContentCheck(session, projectId) {
  projectFor(session, projectId);
  const run = getOne('SELECT run_id, rule_version, run_at FROM compliance_run WHERE project_id = ? ORDER BY run_at DESC, run_id DESC LIMIT 1', [projectId]);
  if (!run) return { run_id: null, findings: [] };
  const findings = query(`SELECT f.finding_id, f.quoted_text, f.finding_status, f.reviewer_note, ${RULE_COLS}
    FROM compliance_finding f JOIN legal_rule r ON r.rule_id = f.rule_id WHERE f.run_id = ? ORDER BY r.rule_code, f.finding_id`, [run.run_id]);
  return {
    ...run, current: run.rule_version === currentVersion(),
    findings: findings.map((f, i) => ({ n: i + 1, ...f, revision: Number(f.revision), is_sample: String(f.is_sample) === 'true' }))
  };
}

export async function reviewFinding(session, findingId, { note } = {}) {
  const clean = validateNote(note);
  if (!userOf(session)) throw new CheckError('UNAUTHENTICATED');
  const row = getOne('SELECT f.finding_id, r.project_id FROM compliance_finding f JOIN compliance_run r ON r.run_id = f.run_id WHERE f.finding_id = ?', [findingId]);
  if (!row) throw new CheckError('NOT_FOUND');
  projectFor(session, row.project_id, { write: true });
  query("UPDATE compliance_finding SET finding_status = 'reviewed', reviewer_note = ? WHERE finding_id = ?", [clean, findingId]);
  return { finding_id: findingId, finding_status: 'reviewed', reviewer_note: clean };
}
