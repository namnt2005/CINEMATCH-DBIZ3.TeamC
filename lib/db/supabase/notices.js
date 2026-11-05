import { userDb, systemDb, rows } from './util.js';
import { ProjectError, projectErrorCode } from '../project-shape.js';
import { notify } from './notifications.js';
import { buildLetter } from '../../notices/letter.js';
import { validateRecipient, validateReview, validateReply } from '../../notices/input.js';

/*
 * Writes go through the SECURITY DEFINER functions of 20261106000100_m7_notices.sql; reads run as the user,
 * so RLS keeps members to their projects' notices. The staff queue and the members' notifications are the
 * System actor's (003 D2), after the role check. Nothing here sends a notice (M7 BR-001).
 */
function rpcResult({ data, error }) {
  if (error) {
    const code = projectErrorCode(error);
    if (code) throw new ProjectError(code);
    throw Object.assign(new Error(error.message), { code: error.code, cause: error });
  }
  return data;
}
const STAFF = ['vfda_staff', 'admin'];
const isStaff = (session) => STAFF.includes(session?.role);

async function notifyMembers(noticeId, eventType) {
  const system = await systemDb();
  const interest = rows(await system.from('location_interest').select('project_id').eq('interest_id', noticeId).maybeSingle());
  if (!interest) return;
  const members = rows(await system.from('project_member').select('user_id').eq('project_id', interest.project_id).eq('invite_status', 'accepted'));
  const project = rows(await system.from('project').select('project_name').eq('project_id', interest.project_id).maybeSingle());
  for (const m of members.filter(m => m.user_id)) {
    await notify({ recipientId: m.user_id, eventType, payload: { project: project?.project_name ?? null } });
  }
}

export async function expressInterest(session, projectId, { location_id: locationId } = {}) {
  const db = await userDb();
  return rpcResult(await db.rpc('app_express_interest', { p_project_id: projectId, p_location_id: locationId }));
}

export async function submitNotice(session, noticeId) {
  const db = await userDb();
  return rpcResult(await db.rpc('app_submit_notice', { p_interest_id: noticeId }));
}

export async function reviewNotice(session, noticeId, input) {
  if (!isStaff(session)) throw new ProjectError('FORBIDDEN');
  const { ok, errors, value } = validateReview(input);
  if (!ok) throw new ProjectError(errors.note === 'notices.error.note_required' ? 'NOTE_REQUIRED' : 'VALIDATION_ERROR');
  const db = await userDb();
  const result = rpcResult(await db.rpc('app_review_notice', { p_interest_id: noticeId, p_decision: value.decision, p_note: value.note }));
  await notifyMembers(noticeId, value.decision === 'approve' ? 'province_notice.approved' : 'province_notice.changes_requested');
  return result;
}

export async function markDownloaded(session, noticeId, { recipient } = {}) {
  if (!validateRecipient(recipient).ok) throw new ProjectError('VALIDATION_ERROR');
  const db = await userDb();
  return rpcResult(await db.rpc('app_mark_notice_downloaded', { p_interest_id: noticeId, p_recipient: recipient }));
}

export async function recordReply(session, noticeId, input) {
  const { ok, value } = validateReply(input);
  if (!ok) throw new ProjectError('VALIDATION_ERROR');
  const db = await userDb();
  const result = rpcResult(await db.rpc('app_record_province_reply', { p_interest_id: noticeId, p_response: value.response, p_note: value.note }));
  if (isStaff(session)) await notifyMembers(noticeId, `province_notice.${value.response}`);
  return result;
}

/** Notice rows with their project, province and locations; `db` is the user client (RLS) or the System client. */
async function shape(db, notices) {
  if (!notices.length) return [];
  const interests = rows(await db.from('location_interest').select('interest_id, project_id, location_id'));
  const projectIds = [...new Set(notices.map(n => interests.find(i => i.interest_id === n.interest_id)?.project_id).filter(Boolean))];
  const projects = projectIds.length ? rows(await db.from('project').select('project_id, project_name, shoot_date, stage').in('project_id', projectIds)) : [];
  const provinces = rows(await db.from('province').select('province_id, name').in('province_id', [...new Set(notices.map(n => n.province_id))]));
  const mine = interests.filter(i => projectIds.includes(i.project_id));
  const locationIds = [...new Set(mine.map(i => i.location_id))];
  const locations = locationIds.length ? rows(await db.from('location').select('location_id, province_id, name_vi, name_en').in('location_id', locationIds)) : [];
  return notices.map((n) => {
    const projectId = interests.find(i => i.interest_id === n.interest_id)?.project_id;
    const project = projects.find(p => p.project_id === projectId) ?? {};
    const missing = project.shoot_date ? [] : ['shoot_date'];
    return {
      notice_id: n.interest_id, project_id: projectId, project_name: project.project_name ?? null,
      province: { id: Number(n.province_id), name: provinces.find(p => Number(p.province_id) === Number(n.province_id))?.name ?? '' },
      locations: mine.filter(i => i.project_id === projectId).map(i => locations.find(l => l.location_id === i.location_id))
        .filter(l => l && Number(l.province_id) === Number(n.province_id)).map(({ location_id, name_vi, name_en }) => ({ location_id, name_vi, name_en })),
      review_status: n.review_status, review_note: n.review_note ?? null, delivery_status: n.delivery_status ?? null, recipient: n.recipient ?? null,
      drafted_at: n.drafted_at, sent_at: n.sent_at ?? null, received_at: n.received_at ?? null, responded_at: n.responded_at ?? null,
      response: n.response ?? null, note: n.note ?? null, summary: n.project_summary, missing,
      can_submit: ['draft', 'changes_requested'].includes(n.review_status) && missing.length === 0
    };
  });
}

export async function listNotices(session, projectId) {
  const db = await userDb();
  const project = rows(await db.from('project').select('project_id').eq('project_id', projectId).maybeSingle());
  if (!project) throw new ProjectError('NOT_FOUND');
  const me = rows(await db.from('project_member').select('permission').eq('project_id', projectId).eq('user_id', session.userId).eq('invite_status', 'accepted').maybeSingle());
  const interests = rows(await db.from('location_interest').select('interest_id').eq('project_id', projectId)).map(i => i.interest_id);
  const notices = interests.length ? rows(await db.from('province_notice').select('*').in('interest_id', interests)) : [];
  return { permission: me?.permission ?? null, notices: (await shape(db, notices)).sort((a, b) => a.province.name.localeCompare(b.province.name)) };
}

export async function listStaffNotices(session, { status = 'submitted' } = {}) {
  if (!isStaff(session)) throw new ProjectError('FORBIDDEN');
  const system = await systemDb();
  const notices = rows(await system.from('province_notice').select('*').eq('review_status', status).order('drafted_at', { ascending: true }));
  return { notices: await shape(system, notices) };
}

/** D7: every member reads an approved letter; nothing is recorded. */
export async function getApprovedLetter(session, noticeId, { recipient } = {}) {
  if (!validateRecipient(recipient).ok) throw new ProjectError('VALIDATION_ERROR');
  const db = await userDb();
  const n = rows(await db.from('province_notice').select('*').eq('interest_id', noticeId).maybeSingle());
  if (!n || n.review_status !== 'approved') throw new ProjectError('NOT_FOUND');
  const [notice] = await shape(db, [n]);
  return { notice, letter: buildLetter({ projectName: notice.project_name, provinceName: notice.province.name, summary: n.project_summary }, recipient) };
}
