import { userDb, systemDb, rows } from './util.js';
import { PartnerError, rpcData } from '../../partners/errors.js';
import { notifyParties } from './partner-notify.js';
import { buildDirectory } from '../../partners/directory.js';
import { shapeProfile } from '../../partners/layers.js';
import { todayInVietnam } from '../../partners/badge.js';

// Supabase source of the partner directory and profiles. Reads run as the user, so Row Level Security decides which
// layers come back (BR-001, R3); guests are not even asked for the member layer. The approval summary of
// *What VFDA checked* (date and references, shown to everyone on SC-20 #10) is read by the System actor.

const signedIn = (session) => Boolean(session?.isAuthenticated && session.userId);
const ORG_COLS = 'org_id, slug, org_name, legal_form, founded_year, hq_province, service_groups, provinces, verified_at, verified_until, art13_eligible, org_status';

export async function listDirectory(session, filters = {}, { today = todayInVietnam() } = {}) {
  const db = await userDb();
  const orgs = rows(await db.from('organisation').select(ORG_COLS)) || [];
  const members = signedIn(session) ? rows(await db.from('organisation_member_layer').select('org_id, intl_project_count, working_languages')) || [] : [];
  const f = { q: filters.q || '', group: filters.group || null, province: filters.province ?? null, language: filters.language || null,
    verified_only: filters.verified_only !== false };
  return buildDirectory(orgs.map(o => ({ ...o, provinces: (o.provinces || []).map(Number) })), members, f, { today, signedIn: signedIn(session) });
}

export async function getProfile(session, slug, { today = todayInVietnam() } = {}) {
  const db = await userDb();
  const org = rows(await db.from('organisation').select(ORG_COLS).eq('slug', slug).maybeSingle());
  if (!org) throw new PartnerError('NOT_FOUND');
  let member = null;
  let priv = null;
  let myRequest = null;
  if (signedIn(session)) {
    member = rows(await db.from('organisation_member_layer').select('*').eq('org_id', org.org_id).maybeSingle());
    priv = rows(await db.from('organisation_private_layer').select('*').eq('org_id', org.org_id).maybeSingle());
    if (session.role === 'member') {
      const open = rows(await db.from('collab_request').select('request_id, status, sent_at').eq('org_id', org.org_id)
        .in('status', ['pending', 'under_review', 'info_requested', 'accepted', 'confirmed']).order('sent_at', { ascending: false }).limit(1)) || [];
      myRequest = open[0] ? { request_id: open[0].request_id, status: open[0].status } : null;
    }
  }
  const system = await systemDb();
  const approved = (rows(await system.from('verification_request').select('reference_projects, decided_at, status').eq('org_id', org.org_id)
    .eq('status', 'approved').order('decided_at', { ascending: false }).limit(1)) || [])[0] ?? null;
  return shapeProfile({ org, member, priv, approved, myRequest }, { today, signedIn: signedIn(session) });
}

async function ownOrgId(session) {
  if (!session?.isAuthenticated || !session.userId) throw new PartnerError('UNAUTHENTICATED');
  if (session.role !== 'partner') throw new PartnerError('FORBIDDEN');
  const db = await userDb();
  const link = (rows(await db.from('organisation_user').select('org_id').eq('user_id', session.userId)) || [])[0];
  if (!link) throw new PartnerError('NOT_FOUND');
  return link.org_id;
}

export async function getMyOrganisation(session) {
  const orgId = await ownOrgId(session);
  const db = await userDb();
  const organisation = rows(await db.from('organisation').select(ORG_COLS).eq('org_id', orgId).maybeSingle());
  const member = rows(await db.from('organisation_member_layer').select('*').eq('org_id', orgId).maybeSingle());
  const priv = rows(await db.from('organisation_private_layer').select('*').eq('org_id', orgId).maybeSingle());
  const latest = (rows(await db.from('verification_request').select('status, reason, decided_at, submitted_at').eq('org_id', orgId)
    .order('submitted_at', { ascending: false }).limit(1)) || [])[0];
  return {
    organisation, member: member ?? null,
    private: priv ? { rate_card: priv.rate_card ?? null, past_clients: priv.past_clients ?? [], direct_contact: priv.direct_contact ?? null } : null,
    verification: { status: latest?.status ?? null, reason: latest?.reason ?? null, verified_until: organisation?.verified_until ?? null }
  };
}

export async function saveOrgProfile(session, value) {
  const orgId = await ownOrgId(session);
  const db = await userDb();
  rpcData(await db.rpc('app_save_org_profile', { p_org_id: orgId, p_fields: value }));
  return getMyOrganisation(session);
}

export async function deactivateOrg(session, { typed_name: typedName, org_id: orgIdInput = null } = {}) {
  const orgId = orgIdInput ?? await ownOrgId(session);
  const db = await userDb();
  const out = rpcData(await db.rpc('app_deactivate_org', { p_org_id: orgId, p_typed_name: typedName }));
  const withdrawn = out?.withdrawn || [];
  const system = await systemDb();
  for (const requestId of withdrawn) {
    const r = rows(await system.from('collab_request').select('*').eq('request_id', requestId).maybeSingle());
    if (!r) continue;
    const project = rows(await system.from('project').select('project_name').eq('project_id', r.project_id).maybeSingle());
    const org = rows(await system.from('organisation').select('org_name').eq('org_id', r.org_id).maybeSingle());
    await notifyParties(r, 'collab_request.withdrawn', { request_id: requestId, project: project?.project_name ?? null, organisation: org?.org_name ?? null, status: 'withdrawn' });
  }
  return { org_status: 'deactivated', withdrawn: withdrawn.length };
}
