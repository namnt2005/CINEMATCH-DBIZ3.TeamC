import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam, writeAudit } from '../audit.js';
import { ProjectError, EDITORS } from '../project-shape.js';
import { notify } from './notifications.js';
import { buildSummary } from '../../notices/summary.js';
import { buildLetter } from '../../notices/letter.js';
import { validateRecipient, validateReview, validateReply } from '../../notices/input.js';

// The node:sqlite twin of the M7 functions of supabase/migrations/20261106000100_m7_notices.sql: the same checks,
// in the same order. The system never sends a notice (M7 BR-001): nothing here writes an email.

const STAFF = ['vfda_staff', 'admin'];
const userOf = (session) => (session?.isAuthenticated && session.userId ? session.userId : null);
const isStaff = (session) => Boolean(userOf(session)) && STAFF.includes(session.role);
const permissionOf = (projectId, userId) => (userId
  ? getOne("SELECT permission FROM project_member WHERE project_id = ? AND user_id = ? AND invite_status = 'accepted'", [projectId, userId])?.permission ?? null
  : null);

/** The notice with its project, or NOT_FOUND. */
function noticeRow(noticeId) {
  const row = getOne(`SELECT n.*, i.project_id, p.project_name, p.stage, pr.name AS province_name
    FROM province_notice n JOIN location_interest i ON i.interest_id = n.interest_id
    JOIN project p ON p.project_id = i.project_id JOIN province pr ON pr.province_id = n.province_id
    WHERE n.interest_id = ?`, [noticeId]);
  if (!row) throw new ProjectError('NOT_FOUND');
  return row;
}

/** Member checks: NOT_FOUND for non-members, then FORBIDDEN, then ARCHIVED (M0 BR-005). */
function editable(session, projectId) {
  const permission = permissionOf(projectId, userOf(session));
  if (!permission) throw new ProjectError('NOT_FOUND');
  if (!EDITORS.includes(permission)) throw new ProjectError('FORBIDDEN');
  if (getOne('SELECT stage FROM project WHERE project_id = ?', [projectId])?.stage === 'archived') throw new ProjectError('ARCHIVED');
  return permission;
}

/** R3: the summary from database data only (FR-002). */
export function noticeSummary(projectId, provinceId) {
  const project = getOne('SELECT project_name, format, shoot_date, shoot_days_vn, crew_size_band FROM project WHERE project_id = ?', [projectId]);
  const province = getOne('SELECT name FROM province WHERE province_id = ?', [provinceId])?.name ?? '';
  const locations = query(`SELECT DISTINCT l.location_id, l.name_vi, l.name_en FROM location_interest i JOIN location l ON l.location_id = i.location_id
    WHERE i.project_id = ? AND l.province_id = ?`, [projectId, provinceId]);
  const partners = query(`SELECT DISTINCT o.org_name FROM collab_request c JOIN organisation o ON o.org_id = c.org_id
    WHERE c.project_id = ? AND c.status = 'confirmed'`, [projectId]).map(r => r.org_name);
  return buildSummary(project, province, locations, partners);
}

const membersOf = (projectId) => query("SELECT user_id FROM project_member WHERE project_id = ? AND invite_status = 'accepted' AND user_id IS NOT NULL", [projectId]).map(r => r.user_id);
function notifyMembers(projectId, eventType, payload) {
  for (const recipientId of membersOf(projectId)) notify({ recipientId, eventType, payload });
}

/** FR-001, D5: the interest; a draft for a new province, or the location added to the province's open notice. */
export function expressInterest(session, projectId, { location_id: locationId } = {}) {
  editable(session, projectId);
  const location = getOne(`SELECT l.location_id, l.province_id, a.contact_email, a.contact_verified FROM location l
    LEFT JOIN authority_contact a ON a.location_id = l.location_id
    WHERE l.location_id = ? AND l.intake_status = 'published' AND (l.published = 'true' OR l.published = 1)`, [locationId]);
  if (!location) throw new ProjectError('NOT_FOUND');
  const open = getOne(`SELECT n.interest_id, n.delivery_status FROM province_notice n JOIN location_interest i ON i.interest_id = n.interest_id
    WHERE i.project_id = ? AND n.province_id = ?`, [projectId, location.province_id]);
  if (open?.delivery_status === 'downloaded') throw new ProjectError('ALREADY_SENT');
  const known = getOne('SELECT interest_id FROM location_interest WHERE project_id = ? AND location_id = ?', [projectId, locationId]);
  const interestId = known?.interest_id ?? randomUUID();
  const now = nowInVietnam();
  withTransaction((db) => {
    if (!known) db.prepare('INSERT INTO location_interest (interest_id, project_id, location_id, created_at) VALUES (?, ?, ?, ?)').run(interestId, projectId, locationId, now);
    if (!open) {
      const verified = location.contact_verified === 'true' || location.contact_verified === 1;
      // authority_email is optional: the crew sends the letter (research Open question 5, decided 06/11/2026)
      db.prepare(`INSERT INTO province_notice (interest_id, province_id, project_summary, authority_email, drafted_at, review_status)
        VALUES (?, ?, '', ?, ?, 'draft')`).run(interestId, location.province_id, verified && location.contact_email ? location.contact_email : null, now);
    }
  });
  const noticeId = open?.interest_id ?? interestId;
  query('UPDATE province_notice SET project_summary = ? WHERE interest_id = ?', [noticeSummary(projectId, location.province_id).text, noticeId]);
  return { interest_id: interestId, notice_id: noticeId, created: !open };
}

/** R1: draft or changes requested → submitted, with a first shooting day (US-1 Scenario 2). */
export function submitNotice(session, noticeId) {
  const n = noticeRow(noticeId);
  editable(session, n.project_id);
  if (!['draft', 'changes_requested'].includes(n.review_status)) throw new ProjectError('INVALID_STATE');
  const summary = noticeSummary(n.project_id, n.province_id);
  if (summary.missing.includes('shoot_date')) throw new ProjectError('SHOOT_DATE_REQUIRED');
  query("UPDATE province_notice SET review_status = 'submitted', project_summary = ? WHERE interest_id = ?", [summary.text, noticeId]);
  return { review_status: 'submitted' };
}

/** R6: VFDA staff approve or request changes; one audit_log row in the same transaction. */
export function reviewNotice(session, noticeId, input) {
  if (!isStaff(session)) throw new ProjectError('FORBIDDEN');
  const { ok, errors, value } = validateReview(input);
  if (!ok) throw new ProjectError(errors.note === 'notices.error.note_required' ? 'NOTE_REQUIRED' : 'VALIDATION_ERROR');
  const n = noticeRow(noticeId);
  if (n.review_status !== 'submitted') throw new ProjectError('INVALID_STATE');
  const approve = value.decision === 'approve';
  withTransaction((db) => {
    if (approve) {
      db.prepare("UPDATE province_notice SET review_status = 'approved', reviewed_by = ?, review_note = NULL, delivery_status = 'queued' WHERE interest_id = ?").run(session.userId, noticeId);
    } else {
      db.prepare("UPDATE province_notice SET review_status = 'changes_requested', reviewed_by = ?, review_note = ? WHERE interest_id = ?").run(session.userId, value.note, noticeId);
    }
    writeAudit(db, { action: approve ? 'notice.approve' : 'notice.request_changes', adminId: session.userId, targetId: noticeId });
  });
  notifyMembers(n.project_id, approve ? 'province_notice.approved' : 'province_notice.changes_requested', { province: n.province_name, project: n.project_name });
  return { review_status: approve ? 'approved' : 'changes_requested' };
}

/** D7: every member reads an approved letter; nothing is recorded. */
export function getApprovedLetter(session, noticeId, { recipient } = {}) {
  const n = noticeRow(noticeId);
  if (!permissionOf(n.project_id, userOf(session)) && !isStaff(session)) throw new ProjectError('NOT_FOUND');
  if (!validateRecipient(recipient).ok) throw new ProjectError('VALIDATION_ERROR');
  if (n.review_status !== 'approved') throw new ProjectError('NOT_FOUND');
  return { notice: n, letter: buildLetter({ projectName: n.project_name, provinceName: n.province_name, summary: n.project_summary }, recipient) };
}

/** D7: owner / edit record the first download with the recipient; later calls change nothing. */
export function markDownloaded(session, noticeId, { recipient } = {}) {
  const n = noticeRow(noticeId);
  const permission = permissionOf(n.project_id, userOf(session));
  if (!permission || n.review_status !== 'approved') throw new ProjectError('NOT_FOUND');
  if (!EDITORS.includes(permission)) throw new ProjectError('FORBIDDEN');
  if (n.stage === 'archived') throw new ProjectError('ARCHIVED');
  if (!validateRecipient(recipient).ok) throw new ProjectError('VALIDATION_ERROR');
  if (!n.sent_at) {
    query("UPDATE province_notice SET recipient = ?, delivery_status = 'downloaded', sent_at = ? WHERE interest_id = ?", [recipient, nowInVietnam(), noticeId]);
  }
  const r = getOne('SELECT delivery_status, recipient, sent_at FROM province_notice WHERE interest_id = ?', [noticeId]);
  return { ...r };
}

/** FR-003, BR-003, D3: the member (owner / edit) or VFDA staff record the reply of a downloaded notice. */
export function recordReply(session, noticeId, input) {
  const n = noticeRow(noticeId);
  const staff = isStaff(session);
  if (!staff) editable(session, n.project_id);
  const { ok, value } = validateReply(input);
  if (!ok) throw new ProjectError('VALIDATION_ERROR');
  if (n.delivery_status !== 'downloaded') throw new ProjectError('INVALID_STATE');
  const now = nowInVietnam();
  withTransaction((db) => {
    db.prepare(`UPDATE province_notice SET response = ?, note = ?, responded_at = COALESCE(responded_at, ?),
      received_at = COALESCE(received_at, COALESCE(responded_at, ?)), response_recorded_by = ? WHERE interest_id = ?`)
      .run(value.response, value.note, now, now, session.userId, noticeId);
    if (staff) writeAudit(db, { action: 'notice.reply', adminId: session.userId, targetId: noticeId });
  });
  if (staff) notifyMembers(n.project_id, `province_notice.${value.response}`, { province: n.province_name, project: n.project_name });
  return shapeNotice(noticeRow(noticeId));
}

function shapeNotice(n) {
  const locations = query(`SELECT l.location_id, l.name_vi, l.name_en FROM location_interest i JOIN location l ON l.location_id = i.location_id
    WHERE i.project_id = ? AND l.province_id = ? ORDER BY l.name_en`, [n.project_id, n.province_id]);
  const summary = noticeSummary(n.project_id, n.province_id);
  return {
    notice_id: n.interest_id, project_id: n.project_id, project_name: n.project_name,
    province: { id: Number(n.province_id), name: n.province_name }, locations,
    review_status: n.review_status, review_note: n.review_note, delivery_status: n.delivery_status, recipient: n.recipient,
    drafted_at: n.drafted_at, sent_at: n.sent_at, received_at: n.received_at, responded_at: n.responded_at,
    response: n.response, note: n.note, summary: n.project_summary, missing: summary.missing,
    can_submit: ['draft', 'changes_requested'].includes(n.review_status) && summary.missing.length === 0
  };
}

/** FR-004: one notice per province of the project, for its members. */
export function listNotices(session, projectId) {
  const permission = permissionOf(projectId, userOf(session));
  if (!permission) throw new ProjectError('NOT_FOUND');
  const rows = query(`SELECT n.*, i.project_id, p.project_name, p.stage, pr.name AS province_name
    FROM province_notice n JOIN location_interest i ON i.interest_id = n.interest_id
    JOIN project p ON p.project_id = i.project_id JOIN province pr ON pr.province_id = n.province_id
    WHERE i.project_id = ? ORDER BY pr.name`, [projectId]);
  return { permission, notices: rows.map(shapeNotice) };
}

/** R6: the staff queue, by review state. */
export function listStaffNotices(session, { status = 'submitted' } = {}) {
  if (!isStaff(session)) throw new ProjectError('FORBIDDEN');
  const rows = query(`SELECT n.*, i.project_id, p.project_name, p.stage, pr.name AS province_name
    FROM province_notice n JOIN location_interest i ON i.interest_id = n.interest_id
    JOIN project p ON p.project_id = i.project_id JOIN province pr ON pr.province_id = n.province_id
    WHERE n.review_status = ? ORDER BY n.drafted_at`, [status]);
  return { notices: rows.map(shapeNotice) };
}
