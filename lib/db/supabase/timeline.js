import { userDb, rows } from './util.js';
import { CheckError } from '../../checks/errors.js';
import { holidaySet } from '../../dates/working-days.js';
import { licensingTimeline } from '../../licensing/timeline.js';
import { milestones } from '../../licensing/milestones.js';
import { todayInVietnam } from '../../projects/input.js';

// Supabase source of SC-29: everything is read as the signed-in member (project, holidays, requests, paragraphs — RLS).
export async function getTimeline(session, projectId, { today = todayInVietnam(), submit } = {}) {
  if (!session?.isAuthenticated || !session.userId) throw new CheckError('UNAUTHENTICATED');
  const db = await userDb();
  const member = rows(await db.from('project_member').select('permission').eq('project_id', projectId).eq('user_id', session.userId).maybeSingle());
  if (!member) throw new CheckError('NOT_FOUND');
  const project = rows(await db.from('project').select('project_id, segment, shoot_date, buffer_days').eq('project_id', projectId).maybeSingle());
  if (!project) throw new CheckError('NOT_FOUND');
  const holidays = holidaySet(rows(await db.from('public_holiday').select('name, start_date, end_date, is_expected')) || []);
  const t = licensingTimeline(project, holidays, today, { submit });
  const confirmed = (rows(await db.from('collab_request').select('confirmed_at, status').eq('project_id', projectId).eq('status', 'confirmed')) || [])
    .map(r => r.confirmed_at).filter(Boolean).sort()[0] ?? null;
  const paragraphs = rows(await db.from('bilingual_paragraph').select('status, reviewed_at').eq('project_id', projectId).eq('doc_code', 'A13_SCRIPT_VI')) || [];
  return { ...t, milestones: milestones({ confirmedAt: confirmed, paragraphs }) };
}
