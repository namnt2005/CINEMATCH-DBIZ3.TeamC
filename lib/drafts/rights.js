// Who may do what with a project's drafts (M5 FR-006, spec §9 test value; specs/009-m5-dossier D4, R7). The same rule
// as app.can_read_draft / app.can_proofread / app.can_confirm_draft: a partner only behind M4's NDA gate — a request
// for the project that is accepted or confirmed, with both NDA rows (producer and partner) accepted.
const yes = (v) => v === true || v === 'true' || v === 1;

/** The partner's best request for the project: { status, org_id, nda: boolean } or null. */
export function partnerAccess({ userOrgIds = [], requests = [], ndaRows = [] }) {
  const orgs = new Set(userOrgIds);
  const both = (requestId) => ['producer', 'partner'].every(party => ndaRows.some(n => n.request_id === requestId && n.party === party && yes(n.accepted)));
  const open = requests.filter(r => orgs.has(r.org_id) && ['accepted', 'confirmed'].includes(r.status) && both(r.request_id));
  return open.find(r => r.status === 'confirmed') || open[0] || null;
}

export function draftRights({ permission = null, stage = null, partner = null }) {
  const editor = ['owner', 'edit'].includes(permission);
  const archived = stage === 'archived';
  return {
    can_read: Boolean(permission) || Boolean(partner),
    can_edit: editor && !archived,
    can_proofread: (editor || Boolean(partner)) && !archived,
    can_confirm: partner?.status === 'confirmed' && !archived,
    reviewer_org_id: editor ? null : partner?.org_id ?? null
  };
}
