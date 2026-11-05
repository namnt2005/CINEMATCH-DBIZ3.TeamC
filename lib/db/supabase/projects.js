import { randomUUID } from 'node:crypto';
import { userDb, systemDb, rows } from './util.js';
import { ProjectError, EDITORS, INVITE_TEMPLATE, asCard, asReadiness, stageCounts, projectErrorCode } from '../project-shape.js';

/*
 * Writes go through the SECURITY DEFINER functions of 20261103000200_m0_readiness.sql, which check the owner
 * and edit permissions (research R6); reads run as the user, so RLS keeps them to the caller's projects.
 * The invitation email row and the names of members are the System actor's (003 D2), after the checks.
 */
function rpcResult({ data, error }) {
  if (error) {
    const code = projectErrorCode(error);
    if (code) throw new ProjectError(code);
    throw Object.assign(new Error(error.message), { code: error.code, cause: error });
  }
  return data;
}

export async function createProject(session, input) {
  const db = await userDb();
  const projectId = rpcResult(await db.rpc('app_create_project', {
    p_project_name: input.project_name, p_format: input.format, p_segment: input.segment,
    p_shoot_date: input.shoot_date ?? null, p_shoot_days_vn: input.shoot_days_vn ?? null,
    p_crew_size_band: input.crew_size_band ?? null, p_provinces: input.provinces ?? null, p_logline: input.logline ?? null
  }));
  return { project_id: projectId };
}

export async function listProjects(session, { stage = null } = {}) {
  if (!session?.userId) return { counts: stageCounts([]), projects: [] };
  const db = await userDb();
  const memberships = rows(await db.from('project_member').select('project_id, permission')
    .eq('user_id', session.userId).eq('invite_status', 'accepted'));
  if (!memberships.length) return { counts: stageCounts([]), projects: [] };
  const projects = rows(await db.from('project').select('project_id, project_name, format, segment, stage, shoot_date, updated_at')
    .in('project_id', memberships.map(m => m.project_id)).order('updated_at', { ascending: false }));
  const shown = projects.filter(p => (stage ? p.stage === stage : p.stage !== 'archived'));
  const readiness = shown.length
    ? rows(await db.from('v_project_readiness').select('project_id, readiness_total, next_action_primary, content_open_findings, dossier_missing').in('project_id', shown.map(p => p.project_id))).map(asReadiness)
    : [];
  const permission = (id) => memberships.find(m => m.project_id === id)?.permission ?? null;
  return {
    counts: stageCounts(projects.map(p => p.stage)),
    projects: shown.map(p => asCard(p, permission(p.project_id), readiness.find(r => r.project_id === p.project_id)))
  };
}

export async function getProject(session, projectId) {
  if (!session?.userId) return null;
  const db = await userDb();
  const project = rows(await db.from('project').select('*').eq('project_id', projectId).maybeSingle());
  if (!project) return null;   // RLS: not a member
  const mine = rows(await db.from('project_member').select('permission').eq('project_id', projectId)
    .eq('user_id', session.userId).eq('invite_status', 'accepted').maybeSingle());
  if (!mine) return null;
  const system = await systemDb();
  const members = rows(await system.from('project_member').select('member_id, user_id, invitee_email, permission, invite_status').eq('project_id', projectId));
  const names = members.some(m => m.user_id)
    ? rows(await system.from('profile').select('user_id, full_name').in('user_id', members.filter(m => m.user_id).map(m => m.user_id)))
    : [];
  const provinces = rows(await db.from('project_province').select('province_id').eq('project_id', projectId)).map(r => Number(r.province_id)).sort((a, b) => a - b);
  const organisation = rows(await system.from('producer_organisation').select('org_name').eq('producer_org_id', project.producer_org_id).maybeSingle())?.org_name ?? null;
  // A failing view must not hide the project: the dashboard shows — and Try again (US-2 Scenario 3)
  let readiness = null;
  let readinessFailed = false;
  try {
    readiness = asReadiness(rows(await db.from('v_project_readiness').select('*').eq('project_id', projectId).maybeSingle()));
  } catch {
    readinessFailed = true;
  }
  const rank = { owner: 0, edit: 1, view: 2 };
  return {
    ...project, organisation, provinces, permission: mine.permission, readiness, readinessFailed,
    members: members
      .map(m => ({ ...m, full_name: names.find(n => n.user_id === m.user_id)?.full_name ?? null,
        invitee_email: EDITORS.includes(mine.permission) ? m.invitee_email : null }))
      .sort((a, b) => rank[a.permission] - rank[b.permission] || String(a.invitee_email).localeCompare(String(b.invitee_email)))
  };
}

export async function updateProject(session, projectId, fields) {
  const db = await userDb();
  return rpcResult(await db.rpc('app_update_project', { p_project_id: projectId, p_fields: fields }));
}

export async function archiveProject(session, projectId) {
  const db = await userDb();
  return rpcResult(await db.rpc('app_archive_project', { p_project_id: projectId }));
}

export async function inviteMember(session, projectId, { invitee_email, permission }) {
  const db = await userDb();
  const email = String(invitee_email).trim().toLowerCase();
  const memberId = rpcResult(await db.rpc('app_invite_member', { p_project_id: projectId, p_email: email, p_permission: permission }));
  const system = await systemDb();
  const project = rows(await system.from('project').select('project_name').eq('project_id', projectId).maybeSingle());
  const inviter = rows(await system.from('profile').select('full_name').eq('user_id', session.userId).maybeSingle())?.full_name ?? null;
  rows(await system.from('email_delivery').insert({
    email_delivery_id: randomUUID(), notification_id: null, template_id: INVITE_TEMPLATE, recipient_email: email,
    variables: { project_name: project?.project_name ?? null, inviter, permission, member_id: memberId },
    delivery_status: 'queued', provider_message_id: null
  }));
  return { member_id: memberId };
}

// The invitee is not a member yet, so RLS hides the pending row: the System reads it, by the caller's own email
export async function listInvitations(session) {
  if (!session?.userId) return [];
  const db = await userDb();
  const account = rows(await db.from('user_account').select('email').eq('user_id', session.userId).maybeSingle());
  if (!account?.email) return [];
  const system = await systemDb();
  const pending = rows(await system.from('project_member').select('member_id, project_id, permission, invitee_email')
    .eq('invite_status', 'pending').eq('invitee_email', account.email.toLowerCase()));
  if (!pending.length) return [];
  const projects = rows(await system.from('project').select('project_id, project_name, stage').in('project_id', pending.map(p => p.project_id)));
  return pending
    .map(p => ({ member_id: p.member_id, project_id: p.project_id, permission: p.permission, project_name: projects.find(x => x.project_id === p.project_id)?.project_name, stage: projects.find(x => x.project_id === p.project_id)?.stage }))
    .filter(p => p.project_name && p.stage !== 'archived')
    .map(({ stage, ...p }) => p)
    .sort((a, b) => a.project_name.localeCompare(b.project_name));
}

export async function acceptInvitation(session, memberId) {
  const db = await userDb();
  return { project_id: rpcResult(await db.rpc('app_accept_invitation', { p_member_id: memberId })) };
}
