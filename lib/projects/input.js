// Project input checks (M0 FR-001, FR-002, FR-004; specs/005-m0-workspace research R7). Pure: used by the API
// routes and by the SC-10 / SC-13 forms in the browser. Errors are dictionary keys (lib/i18n).

export const FORMATS = Object.freeze(['feature', 'documentary', 'commercial', 'tv', 'music_video']);
export const SEGMENTS = Object.freeze(['A', 'B', 'C']);
export const CREW_BANDS = Object.freeze(['u15', '15_50', 'o50']);
export const INVITE_PERMISSIONS = Object.freeze(['view', 'edit']);
export const EDITABLE_STAGES = Object.freeze(['draft', 'preparing']);
export const NAME_MAX = 200;      // FR-001 VARCHAR(200); SC-10 #9 says 2–120 (research Open question 4)
export const LOGLINE_MAX = 500;
export const EMAIL_MAX = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** Today's date in Vietnam, YYYY-MM-DD (the shoot date must be after it). */
export const todayInVietnam = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function checkName(raw, errors) {
  const name = str(raw);
  if (!name) errors.project_name = 'projects.error.name_required';
  else if (name.length > NAME_MAX) errors.project_name = 'projects.error.name_long';
  return name;
}

function checkShootDate(raw, today, errors) {
  if (empty(raw)) return null;
  const value = str(String(raw));
  if (!isRealDate(value)) errors.shoot_date = 'projects.error.shoot_date_invalid';
  else if (value <= today) errors.shoot_date = 'projects.error.shoot_date_past';
  return value;
}

function checkLogline(raw, errors) {
  if (empty(raw)) return null;
  const logline = str(String(raw));
  if (logline.length > LOGLINE_MAX) errors.logline = 'projects.error.logline_long';
  return logline;
}

/**
 * Create a project (FR-001): name, format and segment required; the rest optional.
 * @param {{ today?: string, provinceIds?: number[] }} [options] provinceIds: the 34 ids of `province`
 */
export function validateProjectInput(input, { today = todayInVietnam(), provinceIds = null } = {}) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = {};
  const project_name = checkName(body.project_name, errors);
  if (!FORMATS.includes(body.format)) errors.format = 'projects.error.format_invalid';
  if (!SEGMENTS.includes(body.segment)) errors.segment = 'projects.error.segment_invalid';
  const shoot_date = checkShootDate(body.shoot_date, today, errors);

  let shoot_days_vn = null;
  if (!empty(body.shoot_days_vn)) {
    shoot_days_vn = Number(body.shoot_days_vn);
    if (!Number.isInteger(shoot_days_vn) || shoot_days_vn < 1 || shoot_days_vn > 365) errors.shoot_days_vn = 'projects.error.shoot_days_invalid';
  }
  let crew_size_band = null;
  if (!empty(body.crew_size_band)) {
    crew_size_band = body.crew_size_band;
    if (!CREW_BANDS.includes(crew_size_band)) errors.crew_size_band = 'projects.error.crew_invalid';
  }
  let provinces = [];
  if (!empty(body.provinces)) {
    const list = Array.isArray(body.provinces) ? body.provinces.map(Number) : [NaN];
    const known = provinceIds ? new Set(provinceIds.map(Number)) : null;
    const bad = list.some(id => !Number.isInteger(id) || (known && !known.has(id))) || new Set(list).size !== list.length;
    if (bad) errors.provinces = 'projects.error.provinces_invalid';
    provinces = [...list].sort((a, b) => a - b);
  }
  const logline = checkLogline(body.logline, errors);
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { project_name, format: body.format, segment: body.segment, shoot_date, shoot_days_vn, crew_size_band, provinces, logline }
  };
}

/** FR-002: only the fields sent are checked; name, shoot date, logline and stage (draft / preparing). */
export function validateProjectUpdate(input, { today = todayInVietnam() } = {}) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = {};
  const value = {};
  if ('project_name' in body) value.project_name = checkName(body.project_name, errors);
  if ('shoot_date' in body) value.shoot_date = checkShootDate(body.shoot_date, today, errors);
  if ('logline' in body) value.logline = checkLogline(body.logline, errors);
  if ('stage' in body) {
    value.stage = body.stage;
    if (!EDITABLE_STAGES.includes(body.stage)) errors.stage = 'settings.error.stage_invalid';
  }
  if (Object.keys(value).length === 0) errors._ = 'settings.error.nothing_to_save';
  return { ok: Object.keys(errors).length === 0, errors, value };
}

/** FR-004: an email and view or edit — never owner (one owner per project, plan D2). */
export function validateInvite(input) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = {};
  const invitee_email = str(body.invitee_email).toLowerCase();
  if (!invitee_email) errors.invitee_email = 'settings.error.email_required';
  else if (invitee_email.length > EMAIL_MAX || !EMAIL_RE.test(invitee_email)) errors.invitee_email = 'settings.error.email_invalid';
  if (!INVITE_PERMISSIONS.includes(body.permission)) errors.permission = 'settings.error.permission_invalid';
  return { ok: Object.keys(errors).length === 0, errors, value: { invitee_email, permission: body.permission } };
}
