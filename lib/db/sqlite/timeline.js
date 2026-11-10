import { query, getOne } from '../client.js';
import { CheckError } from '../../checks/errors.js';
import { holidaySet } from '../../dates/working-days.js';
import { licensingTimeline } from '../../licensing/timeline.js';
import { milestones } from '../../licensing/milestones.js';
import { todayInVietnam } from '../../projects/input.js';
import { userOf, permissionOf } from './partner-access.js';

// node:sqlite source of SC-29 (and of the SC-12 strip and the SC-27 line, D13).
export async function getTimeline(session, projectId, { today = todayInVietnam(), submit } = {}) {
  if (!userOf(session)) throw new CheckError('UNAUTHENTICATED');
  const project = getOne('SELECT project_id, segment, shoot_date, buffer_days FROM project WHERE project_id = ?', [projectId]);
  if (!project || !permissionOf(session, projectId)) throw new CheckError('NOT_FOUND');
  const t = licensingTimeline(project, holidaySet(query('SELECT name, start_date, end_date, is_expected FROM public_holiday')), today, { submit });
  const confirmedAt = getOne("SELECT MIN(confirmed_at) AS at FROM collab_request WHERE project_id = ? AND status = 'confirmed'", [projectId])?.at ?? null;
  const paragraphs = query("SELECT status, reviewed_at FROM bilingual_paragraph WHERE project_id = ? AND doc_code = 'A13_SCRIPT_VI'", [projectId]);
  return { ...t, milestones: milestones({ confirmedAt, paragraphs }) };
}
