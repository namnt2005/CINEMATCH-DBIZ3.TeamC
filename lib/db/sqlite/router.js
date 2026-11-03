import { randomUUID } from 'node:crypto';
import { query, getOne } from '../client.js';
import { currentRules } from '../../router/decide.js';
import { asRule, asRequirement, overrideValues } from '../router-shape.js';

export function getRouterData() {
  return {
    rules: currentRules(query('SELECT * FROM segment_rule').map(asRule)),
    requirements: query('SELECT * FROM segment_requirement').map(asRequirement)
  };
}

/** One row per complete answer set, owned by the anonymous session (D3; never a project here). */
export function saveDecision({ sessionKey, answers, decision, journeyConfig }) {
  const id = randomUUID();
  query(`INSERT INTO segment_decision (segment_decision_id, project_id, session_key, segment_rule_id, q1_shoot_in_vn,
           q2_release, q3_producer, q4_needs, segment, segment_override, decided_by, journey_config)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`, [
    id, sessionKey, decision.segment_rule_id, String(answers.q1_shoot_in_vn), answers.q2_release, answers.q3_producer,
    JSON.stringify(answers.q4_needs || []), decision.segment, JSON.stringify(decision.decided_by), journeyConfig ? JSON.stringify(journeyConfig) : null
  ]);
  return { segment_decision_id: id };
}

/** BR-003: records the override on a row of the same session; null when the row is not the session's. */
export function overrideDecision({ sessionKey, id, segment }) {
  const row = getOne('SELECT segment_rule_id FROM segment_decision WHERE segment_decision_id = ? AND session_key = ?', [id, sessionKey]);
  if (!row) return null;
  const rule = row.segment_rule_id ? getOne('SELECT result_segment FROM segment_rule WHERE segment_rule_id = ?', [row.segment_rule_id]) : null;
  const values = overrideValues(rule?.result_segment ?? null, segment);
  query('UPDATE segment_decision SET segment = ?, segment_override = ? WHERE segment_decision_id = ?', [values.segment, values.segment_override, id]);
  return { segment_decision_id: id, ...values };
}
