import { userDb, systemDb, rows } from './util.js';
import { PartnerError, rpcData } from '../../partners/errors.js';
import { codeHash, orgSlug, maskEmail, invitationState } from '../../partners/invitations.js';
import { validateInvitationEmail, validateOrganisationFields } from '../../partners/input.js';

// Supabase source of partner invitations: writes through app_create_partner_invitation and app_accept_partner_invitation
// as the signed-in user; the invitation page of a guest is read by the System actor, found by the code's hash only.

const isStaffRole = (session) => ['vfda_staff', 'admin'].includes(session?.role);

export async function createInvitation(session, { org_id: orgId = null, org = null, email }) {
  if (!session?.isAuthenticated || !session.userId) throw new PartnerError('UNAUTHENTICATED');
  if (!isStaffRole(session)) throw new PartnerError('FORBIDDEN');
  const address = validateInvitationEmail(email);
  if (!address.ok) throw new PartnerError('VALIDATION_ERROR', address.errors);
  let newOrg = null;
  if (!orgId) {
    const fields = validateOrganisationFields(org);
    if (!fields.ok) throw new PartnerError('VALIDATION_ERROR', fields.errors);
    const system = await systemDb();
    const base = orgSlug(fields.value.org_name);
    let slug = base;
    for (let i = 2; rows(await system.from('organisation').select('org_id').eq('slug', slug).maybeSingle()); i++) slug = `${base}-${i}`;
    newOrg = { ...fields.value, slug };
  }
  const db = await userDb();
  const out = rpcData(await db.rpc('app_create_partner_invitation', { p_org_id: orgId, p_org: newOrg, p_email: address.value }));
  const system = await systemDb();
  const name = rows(await system.from('organisation').select('org_name').eq('org_id', out.org_id).maybeSingle())?.org_name ?? null;
  return { invitation_id: out.invitation_id, org_id: out.org_id, org_name: name, expires_at: out.expires_at, code: out.secret };
}

export async function listInvitations(session) {
  if (!session?.isAuthenticated || !session.userId) throw new PartnerError('UNAUTHENTICATED');
  if (!isStaffRole(session)) throw new PartnerError('FORBIDDEN');
  const db = await userDb();
  const list = rows(await db.from('partner_invitation').select('invitation_id, org_id, email, invited_at, expires_at, accepted_at')
    .order('invited_at', { ascending: false })) || [];
  const orgs = list.length ? rows(await db.from('organisation').select('org_id, org_name').in('org_id', [...new Set(list.map(i => i.org_id))])) || [] : [];
  const name = Object.fromEntries(orgs.map(o => [o.org_id, o.org_name]));
  return { invitations: list.map(i => ({ invitation_id: i.invitation_id, org_name: name[i.org_id] ?? null, email: i.email, invited_at: i.invited_at,
    expires_at: i.expires_at, state: invitationState(i) })) };
}

export async function getInvitation(code) {
  const system = await systemDb();
  const inv = rows(await system.from('partner_invitation').select('org_id, email, expires_at, accepted_at').eq('code_hash', codeHash(code)).maybeSingle());
  if (!inv) throw new PartnerError('NOT_FOUND');
  const org = rows(await system.from('organisation').select('org_name').eq('org_id', inv.org_id).maybeSingle());
  return { org_name: org?.org_name ?? null, email_hint: maskEmail(inv.email), state: invitationState(inv) };
}

export async function acceptInvitation(session, code) {
  if (!session?.isAuthenticated || !session.userId) throw new PartnerError('UNAUTHENTICATED');
  const db = await userDb();
  return rpcData(await db.rpc('app_accept_partner_invitation', { p_code: String(code ?? '') }));
}

export async function listInvitableOrganisations(session) {
  if (!isStaffRole(session)) throw new PartnerError('FORBIDDEN');
  const db = await userDb();
  return (rows(await db.from('organisation').select('org_id, org_name, org_status').order('org_name')) || [])
    .filter(o => o.org_status !== 'deactivated').map(({ org_id: orgId, org_name: name }) => ({ org_id: orgId, org_name: name }));
}
