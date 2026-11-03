import { randomUUID } from 'node:crypto';
import { systemDb, rows } from './util.js';
import { currentRules } from '../../router/decide.js';
import { asRule, asRequirement, overrideValues } from '../router-shape.js';

/*
 * Guests have no grant on segment_rule or segment_decision (003 policy matrix), and the router needs no
 * sign-in: the server reads and writes as the System actor (secret key, 003 D2) after validating the answers
 * and recomputing the segment itself (specs/004-m1-router plan Complexity Tracking).
 */
export async function getRouterData() {
  const db = await systemDb();
  return {
    rules: currentRules(rows(await db.from('segment_rule').select('*')).map(asRule)),
    requirements: rows(await db.from('segment_requirement').select('*')).map(asRequirement)
  };
}

export async function saveDecision({ sessionKey, answers, decision, journeyConfig }) {
  const db = await systemDb();
  const id = randomUUID();
  rows(await db.from('segment_decision').insert({
    segment_decision_id: id, project_id: null, session_key: sessionKey, segment_rule_id: decision.segment_rule_id,
    q1_shoot_in_vn: answers.q1_shoot_in_vn, q2_release: answers.q2_release, q3_producer: answers.q3_producer,
    q4_needs: answers.q4_needs || [], segment: decision.segment, segment_override: null,
    decided_by: decision.decided_by, journey_config: journeyConfig
  }));
  return { segment_decision_id: id };
}

export async function overrideDecision({ sessionKey, id, segment }) {
  const db = await systemDb();
  const row = rows(await db.from('segment_decision').select('segment_rule_id').eq('segment_decision_id', id).eq('session_key', sessionKey).maybeSingle());
  if (!row) return null;
  const rule = row.segment_rule_id
    ? rows(await db.from('segment_rule').select('result_segment').eq('segment_rule_id', row.segment_rule_id).maybeSingle())
    : null;
  const values = overrideValues(rule?.result_segment ?? null, segment);
  rows(await db.from('segment_decision').update(values).eq('segment_decision_id', id).eq('session_key', sessionKey));
  return { segment_decision_id: id, ...values };
}
