import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam } from '../audit.js';
import { ProjectError, EDITORS, INVITE_TEMPLATE, asCard, stageCounts } from '../project-shape.js';
import { getReadiness, listReadiness } from './readiness.js';

// The node:sqlite twin of the M0 write functions (supabase/migrations/20261103000200_m0_readiness.sql): the same
// checks, in the same order, inside one transaction. There is no RLS here, so every read checks membership.

const userOf = (session) => (session?.isAuthenticated && session.userId ? session.userId : null);

function permissionOf(projectId, userId) {
  if (!userId) return null;
  return getOne("SELECT permission FROM project_member WHERE project_id = ? AND user_id = ? AND invite_status = 'accepted'", [projectId, userId])?.permission ?? null;
}

/** NOT_FOUND for non-members, then FORBIDDEN when the permission is not enough, then ARCHIVED (BR-005). */
function writable(session, projectId, allowed) {
  const permission = permissionOf(projectId, userOf(session));
  if (!permission) throw new ProjectError('NOT_FOUND');
  if (!allowed.includes(permission)) throw new ProjectError('FORBIDDEN');
  const project = getOne('SELECT * FROM project WHERE project_id = ?', [projectId]);
  if (project.stage === 'archived') throw new ProjectError('ARCHIVED');
  return project;
}

const nameTaken = (orgId, name, exceptId = null) => Boolean(getOne(
  'SELECT 1 AS hit FROM project WHERE producer_org_id = ? AND project_name = ? AND project_id <> COALESCE(?, \'\')', [orgId, name, exceptId]));

/** FR-001: the project as a draft and its creator as the owner (plan D2), in one transaction. */
export function createProject(session, input) {
  const userId = userOf(session);
  if (!userId) throw new ProjectError('UNAUTHENTICATED');
  const account = getOne('SELECT ua.email, pr.producer_org_id FROM user_account ua LEFT JOIN profile pr ON pr.user_id = ua.user_id WHERE ua.user_id = ?', [userId]);
  if (!account?.producer_org_id) throw new ProjectError('NO_ORGANISATION');
  const name = String(input.project_name).trim();
  if (nameTaken(account.producer_org_id, name)) throw new ProjectError('NAME_TAKEN');
  const projectId = randomUUID();
  withTransaction((db) => {
    db.prepare(`INSERT INTO project (project_id, producer_org_id, project_name, format, segment, shoot_date, buffer_days,
      shoot_days_vn, crew_size_band, logline, stage, updated_at) VALUES (?, ?, ?, ?, ?, ?, 7, ?, ?, ?, 'draft', ?)`)
      .run(projectId, account.producer_org_id, name, input.format, input.segment, input.shoot_date ?? null,
        input.shoot_days_vn ?? null, input.crew_size_band ?? null, input.logline ?? null, nowInVietnam());
    db.prepare("INSERT INTO project_member (member_id, project_id, user_id, invitee_email, permission, invite_status) VALUES (?, ?, ?, ?, 'owner', 'accepted')")
      .run(randomUUID(), projectId, userId, account.email);
    const province = db.prepare('INSERT INTO project_province (project_id, province_id) VALUES (?, ?)');
    for (const id of input.provinces ?? []) province.run(projectId, id);
  });
  return { project_id: projectId };
}

/** FR-003: the caller's projects as an accepted member; archived ones only with stage = archived (BR-005). */
export function listProjects(session, { stage = null } = {}) {
  const userId = userOf(session);
  if (!userId) return { counts: stageCounts([]), projects: [] };
  const mine = query(`SELECT p.*, pm.permission FROM project p JOIN project_member pm ON pm.project_id = p.project_id
    WHERE pm.user_id = ? AND pm.invite_status = 'accepted' ORDER BY p.updated_at DESC, p.project_id`, [userId]);
  const shown = mine.filter(p => (stage ? p.stage === stage : p.stage !== 'archived'));
  const readiness = listReadiness(shown.map(p => p.project_id), session);
  return {
    counts: stageCounts(mine.map(p => p.stage)),
    projects: shown.map(p => asCard(p, p.permission, readiness.find(r => r.project_id === p.project_id)))
  };
}

/** One project for a member: details, the caller's permission, members (emails for owner and editors only). */
export function getProject(session, projectId) {
  const permission = permissionOf(projectId, userOf(session));
  if (!permission) return null;
  const project = getOne('SELECT * FROM project WHERE project_id = ?', [projectId]);
  const members = query(`SELECT pm.member_id, pm.user_id, pm.invitee_email, pm.permission, pm.invite_status, pr.full_name
    FROM project_member pm LEFT JOIN profile pr ON pr.user_id = pm.user_id WHERE pm.project_id = ?
    ORDER BY CASE pm.permission WHEN 'owner' THEN 0 WHEN 'edit' THEN 1 ELSE 2 END, pm.invitee_email`, [projectId]);
  const provinces = query('SELECT province_id FROM project_province WHERE project_id = ? ORDER BY province_id', [projectId]).map(r => Number(r.province_id));
  const organisation = getOne('SELECT org_name FROM producer_organisation WHERE producer_org_id = ?', [project.producer_org_id])?.org_name ?? null;
  return {
    ...project, buffer_days: Number(project.buffer_days), shoot_days_vn: project.shoot_days_vn === null ? null : Number(project.shoot_days_vn),
    organisation, provinces, permission,
    members: members.map(m => ({ ...m, invitee_email: EDITORS.includes(permission) ? m.invitee_email : null })),
    readiness: getReadiness(projectId, session), readinessFailed: false
  };
}

/** FR-002: owner or edit change name, shoot date, logline and stage (draft / preparing); last write wins. */
export function updateProject(session, projectId, fields) {
  const project = writable(session, projectId, EDITORS);
  if ('stage' in fields && !['draft', 'preparing'].includes(fields.stage)) throw new ProjectError('INVALID_STAGE');
  const name = 'project_name' in fields ? String(fields.project_name).trim() : project.project_name;
  if ('project_name' in fields && nameTaken(project.producer_org_id, name, projectId)) throw new ProjectError('NAME_TAKEN');
  const updatedAt = nowInVietnam();
  query('UPDATE project SET project_name = ?, shoot_date = ?, logline = ?, stage = ?, updated_at = ? WHERE project_id = ?', [
    name, 'shoot_date' in fields ? fields.shoot_date : project.shoot_date, 'logline' in fields ? fields.logline : project.logline,
    'stage' in fields ? fields.stage : project.stage, updatedAt, projectId]);
  return { project_id: projectId, updated_at: updatedAt };
}

/** BR-005: archive; documents, requests, members and notices stay. */
export function archiveProject(session, projectId) {
  writable(session, projectId, EDITORS);
  query("UPDATE project SET stage = 'archived', updated_at = ? WHERE project_id = ?", [nowInVietnam(), projectId]);
  return { project_id: projectId, stage: 'archived' };
}

/** FR-004, D3: the owner invites; one pending row and one queued email, no notification (no account needed). */
export function inviteMember(session, projectId, { invitee_email, permission }) {
  const project = writable(session, projectId, ['owner']);
  if (!['view', 'edit'].includes(permission)) throw new ProjectError('INVALID_PERMISSION');
  const email = String(invitee_email).trim().toLowerCase();
  if (getOne('SELECT 1 AS hit FROM project_member WHERE project_id = ? AND lower(invitee_email) = ?', [projectId, email])) {
    throw new ProjectError('ALREADY_INVITED');
  }
  const inviter = getOne('SELECT full_name FROM profile WHERE user_id = ?', [session.userId])?.full_name ?? null;
  const memberId = randomUUID();
  withTransaction((db) => {
    db.prepare("INSERT INTO project_member (member_id, project_id, user_id, invitee_email, permission, invite_status) VALUES (?, ?, NULL, ?, ?, 'pending')")
      .run(memberId, projectId, email, permission);
    db.prepare("INSERT INTO email_delivery (email_delivery_id, notification_id, template_id, recipient_email, variables, delivery_status, provider_message_id) VALUES (?, NULL, ?, ?, ?, 'queued', NULL)")
      .run(randomUUID(), INVITE_TEMPLATE, email, JSON.stringify({ project_name: project.project_name, inviter, permission, member_id: memberId }));
  });
  return { member_id: memberId };
}

const accountEmail = (userId) => getOne('SELECT lower(email) AS email FROM user_account WHERE user_id = ?', [userId])?.email ?? null;

/** D3: pending invitations for the caller's account email (SC-10 Invitations). */
export function listInvitations(session) {
  const userId = userOf(session);
  if (!userId) return [];
  return query(`SELECT pm.member_id, pm.project_id, pm.permission, p.project_name FROM project_member pm
    JOIN project p ON p.project_id = pm.project_id
    WHERE pm.invite_status = 'pending' AND lower(pm.invitee_email) = ? AND COALESCE(p.stage, '') <> 'archived'
    ORDER BY p.project_name`, [accountEmail(userId)]);
}

/** D3: only the account with the invited email accepts; then the project is in its list. */
export function acceptInvitation(session, memberId) {
  const userId = userOf(session);
  if (!userId) throw new ProjectError('UNAUTHENTICATED');
  const row = getOne(`SELECT pm.project_id, p.stage FROM project_member pm JOIN project p ON p.project_id = pm.project_id
    WHERE pm.member_id = ? AND pm.invite_status = 'pending' AND lower(pm.invitee_email) = ?`, [memberId, accountEmail(userId)]);
  if (!row) throw new ProjectError('NOT_FOUND');
  if (row.stage === 'archived') throw new ProjectError('ARCHIVED');
  query("UPDATE project_member SET user_id = ?, invite_status = 'accepted' WHERE member_id = ?", [userId, memberId]);
  return { project_id: row.project_id };
}
