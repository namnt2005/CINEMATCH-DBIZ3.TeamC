// Input checks of M4 (specs/007-m4-partners data-model §5). Every error is a dictionary key in both languages.
import { SERVICE_GROUPS, isServiceGroup } from './service-groups.js';

const fail = (errors) => ({ ok: false, errors, value: null });
const ok = (value) => ({ ok: true, errors: {}, value });
const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** SC-19 filters (FR-005, FR-006): q ≤ 80, one of the 12 groups, a province id, an ISO 639-1 code, verified_only. */
export function validateDirectoryQuery(params) {
  const get = (k) => (params.get ? params.get(k) : params[k]) ?? '';
  const errors = {};
  const q = String(get('q')).trim();
  if (q.length > 80) errors.q = 'partners.error.query';
  const group = String(get('group'));
  if (group && !isServiceGroup(group)) errors.group = 'partners.error.service_groups';
  const province = String(get('province'));
  if (province && !/^\d{1,2}$/.test(province)) errors.province = 'partners.error.province';
  const language = String(get('language'));
  if (language && !/^[a-z]{2}$/.test(language)) errors.language = 'partners.error.language';
  const verified = String(get('verified_only'));
  if (verified && !['true', 'false'].includes(verified)) errors.verified_only = 'partners.error.verified_only';
  if (Object.keys(errors).length) return fail(errors);
  return ok({ q, group: group || null, province: province ? Number(province) : null, language: language || null, verified_only: verified !== 'false' });
}

const groupsError = (groups) => (!Array.isArray(groups) || groups.length === 0 || groups.some(g => !isServiceGroup(g)) || new Set(groups).size !== groups.length);
const provincesError = (list, min = 1) => (!Array.isArray(list) || list.length < min || list.some(p => !Number.isInteger(Number(p)) || Number(p) < 1 || Number(p) > 34));

/** The organisation fields VFDA enters with an invitation (layer 1). */
export function validateOrganisationFields(input) {
  const o = input && typeof input === 'object' ? input : {};
  const errors = {};
  const name = text(o.org_name);
  if (name.length < 1 || name.length > 200) errors.org_name = 'partners.error.name';
  const legal = text(o.legal_form);
  if (legal.length < 1 || legal.length > 60) errors.legal_form = 'partners.error.legal_form';
  if (groupsError(o.service_groups)) errors.service_groups = 'partners.error.service_groups';
  if (provincesError(o.provinces)) errors.provinces = 'partners.error.province';
  if (o.hq_province !== undefined && o.hq_province !== null && o.hq_province !== '' && provincesError([o.hq_province])) errors.hq_province = 'partners.error.province';
  if (Object.keys(errors).length) return fail(errors);
  return ok({ org_name: name, legal_form: legal, service_groups: [...o.service_groups], provinces: o.provinces.map(Number),
    hq_province: o.hq_province === undefined || o.hq_province === '' || o.hq_province === null ? null : Number(o.hq_province) });
}

/** An invitation address: valid form, ≤ 254 characters, kept lower-case. */
export function validateInvitationEmail(email) {
  const e = text(email).toLowerCase();
  if (!e || e.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return fail({ email: 'invitations.error.email' });
  return ok(e);
}

const FORBIDDEN_PROFILE_FIELDS = ['org_id', 'slug', 'verified_at', 'verified_until', 'art13_eligible', 'org_status'];
const listOf = (v, max, each) => Array.isArray(v) && v.length <= max && v.every(x => typeof x === 'string' && x.trim().length >= 1 && x.trim().length <= each);

/** SC-21 profile save (FR-001): layers 1–3; the badge, the Article 13 flag, the status and the slug are VFDA's (SR-326). */
export function validateOrgProfile(input) {
  const f = input && typeof input === 'object' ? input : {};
  const errors = {};
  for (const k of FORBIDDEN_PROFILE_FIELDS) if (k in f) errors[k] = 'partners.error.vfda_only';
  const value = {};
  if ('org_name' in f) { const v = text(f.org_name); if (v.length < 1 || v.length > 200) errors.org_name = 'partners.error.name'; else value.org_name = v; }
  if ('legal_form' in f) { const v = text(f.legal_form); if (v.length < 1 || v.length > 60) errors.legal_form = 'partners.error.legal_form'; else value.legal_form = v; }
  if ('founded_year' in f) {
    const y = Number(f.founded_year);
    if (f.founded_year === null || f.founded_year === '') value.founded_year = null;
    else if (!Number.isInteger(y) || y < 1900 || y > new Date().getFullYear()) errors.founded_year = 'partners.error.founded_year';
    else value.founded_year = y;
  }
  if ('hq_province' in f) { if (f.hq_province === null || f.hq_province === '') value.hq_province = null; else if (provincesError([f.hq_province])) errors.hq_province = 'partners.error.province'; else value.hq_province = Number(f.hq_province); }
  if ('service_groups' in f) { if (groupsError(f.service_groups)) errors.service_groups = 'partners.error.service_groups'; else value.service_groups = [...f.service_groups]; }
  if ('provinces' in f) { if (provincesError(f.provinces)) errors.provinces = 'partners.error.province'; else value.provinces = f.provinces.map(Number); }
  for (const k of ['capability_desc_vi', 'capability_desc_en']) {
    if (k in f) { const v = typeof f[k] === 'string' ? f[k] : ''; if (v.length > 4000) errors[k] = 'partners.error.capability'; else value[k] = v.trim() || null; }
  }
  if ('portfolio' in f) { if (!listOf(f.portfolio, 30, 200)) errors.portfolio = 'partners.error.portfolio'; else value.portfolio = f.portfolio.map(x => x.trim()); }
  if ('working_languages' in f) {
    const l = f.working_languages;
    if (!Array.isArray(l) || l.some(x => !/^[a-z]{2}$/.test(x)) || new Set(l).size !== l.length) errors.working_languages = 'partners.error.language';
    else value.working_languages = [...l];
  }
  if ('rate_card' in f) {
    const r = f.rate_card;
    const good = Array.isArray(r) && r.length <= 50 && r.every(x => x && text(x.item).length >= 1 && text(x.item).length <= 120
      && Number.isInteger(Number(x.amount)) && Number(x.amount) >= 0 && text(x.unit).length >= 1 && text(x.unit).length <= 40);
    if (!good) errors.rate_card = 'partners.error.rate_card';
    else value.rate_card = r.map(x => ({ item: text(x.item), amount: Number(x.amount), unit: text(x.unit), currency: 'VND' }));
  }
  if ('past_clients' in f) { if (!listOf(f.past_clients, 50, 200)) errors.past_clients = 'partners.error.past_clients'; else value.past_clients = f.past_clients.map(x => x.trim()); }
  if ('direct_contact' in f) { const v = typeof f.direct_contact === 'string' ? f.direct_contact.trim() : ''; if (v.length > 200) errors.direct_contact = 'partners.error.direct_contact'; else value.direct_contact = v || null; }
  if (Object.keys(errors).length) return fail(errors);
  return ok(value);
}

export { SERVICE_GROUPS };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** SC-23 (FR-012): a project, 1+ of the 12 groups, a note of at most 1000 characters. */
export function validateRequestInput(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = {};
  if (!UUID.test(String(b.project_id || ''))) errors.project_id = 'requests.error.project';
  if (!UUID.test(String(b.org_id || ''))) errors.org_id = 'requests.error.organisation';
  if (groupsError(b.services)) errors.services = 'partners.error.service_groups';
  const note = typeof b.note === 'string' ? b.note.trim() : '';
  if (note.length > 1000) errors.note = 'requests.error.note_long';
  if (Object.keys(errors).length) return fail(errors);
  return ok({ project_id: b.project_id, org_id: b.org_id, services: [...b.services], note: note || null });
}

/** SC-25 partner response (FR-014): one of four decisions; a note of at most 2000 characters. */
export function validateResponse(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = {};
  if (!['under_review', 'info_requested', 'accepted', 'declined'].includes(b.decision)) errors.decision = 'requests.error.decision';
  const note = typeof b.note === 'string' ? b.note.trim() : '';
  if (note.length > 2000) errors.note = 'requests.error.message';
  if (Object.keys(errors).length) return fail(errors);
  return ok({ decision: b.decision, note: note || null, nda_accepted: b.nda_accepted === true });
}

/** SC-25 #9 producer NDA (FR-017): accepted:true with the current version only (analysis U3). */
export function validateNdaInput(body, currentVersion) {
  const b = body && typeof body === 'object' ? body : {};
  if (b.accepted !== true || b.nda_version !== currentVersion) return fail({ nda: 'requests.error.nda' });
  return ok({ nda_version: currentVersion });
}

/** SC-25 #12 (BR-009): a message of 1–2000 characters. */
export function validateMessage(body) {
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  if (text.length < 1 || text.length > 2000) return fail({ body: 'requests.error.message' });
  return ok({ body: text });
}

/** An optional note of at most 2000 characters (withdraw). */
export function validateOptionalNote(body) {
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (note.length > 2000) return fail({ note: 'requests.error.message' });
  return ok({ note: note || null });
}

/** SC-22 (FR-008): at least two non-empty references (empty rows are ignored), each at most 200 characters, at most 10. */
export function validateVerificationInput(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = {};
  if (typeof b.path !== 'string' || !b.path) errors.path = 'verification.error.file';
  const refs = Array.isArray(b.reference_projects) ? b.reference_projects.map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean) : [];
  if (refs.length < 2 || refs.length > 10 || refs.some(r => r.length > 200)) errors.reference_projects = 'verification.error.references';
  if (Object.keys(errors).length) return fail(errors);
  return ok({ path: b.path, reference_projects: refs });
}

/** SC-36 (FR-010): approved, or rejected with a reason of 1–1000 characters. */
export function validateDecision(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (!['approved', 'rejected'].includes(b.decision)) return fail({ decision: 'verification.error.decision' });
  const reason = typeof b.reason === 'string' ? b.reason.trim() : '';
  if (b.decision === 'rejected' && (reason.length < 1 || reason.length > 1000)) return fail({ reason: 'verification.error.reason_required' });
  return ok({ decision: b.decision, reason: b.decision === 'rejected' ? reason : null });
}

/** SC-36 #10 (Q3): switching on needs the business-line confirmation. */
export function validateArt13(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (typeof b.on !== 'boolean') return fail({ on: 'verification.error.art13' });
  if (b.on && b.business_line_confirmed !== true) return fail({ business_line_confirmed: 'verification.error.business_line' });
  return ok({ on: b.on, business_line_confirmed: b.business_line_confirmed === true });
}

/** SC-22 upload request: a PDF of at most 25 MB. */
export function validateUploadRequest(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (b.content_type !== 'application/pdf' || !Number.isFinite(Number(b.size)) || Number(b.size) <= 0 || Number(b.size) > 25 * 1024 * 1024) {
    return fail({ file: 'verification.error.file' });
  }
  return ok({ size: Number(b.size), content_type: b.content_type });
}
