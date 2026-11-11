// The document kit of SC-26 (M5 FR-001, BR-003, BR-004, Clarifications Q1; specs/009-m5-dossier D1, research R1).
// Pure: every list comes from the configuration rows the data layer reads (segment_requirement, document_type, the
// location links of the shortlisted locations, the states); nothing is named here.
const BASES = Object.freeze(['law', 'common', 'location']);
const list = (v) => (Array.isArray(v) ? v : v ? JSON.parse(v) : []);
const yes = (v) => v === true || v === 'true' || v === 1;

/**
 * @param segment        the project's segment, or the segment of the chip view (SC-26 #4)
 * @param requirements   segment_requirement rows { segment, requirement_code, needed }
 * @param types          document_type rows
 * @param locationDocs   doc_codes that a shortlisted location of the project needs (location_document_type)
 * @param hasShortlist   the project has at least one shortlisted location
 * @param states         { doc_code: state } — Article 13 from v_dossier_check, others from slots or M7; default missing
 */
export function documentKit({ segment, requirements = [], types = [], locationDocs = [], hasShortlist = false, states = {} }) {
  const needed = new Set(requirements.filter(r => r.segment === segment && yes(r.needed)).map(r => r.requirement_code));
  const atLocations = new Set(locationDocs);
  const inKit = (t) => {
    const segs = list(t.segments);
    if (t.basis === 'location') return segs.includes(segment) && atLocations.has(t.doc_code);
    return t.requirement_code ? needed.has(t.requirement_code) : segs.includes(segment);
  };
  const rows = types.filter(inKit).map(t => ({
    doc_code: t.doc_code, name_vi: t.name_vi, name_en: t.name_en, basis: t.basis, template_url: t.template_url || null,
    awaiting_confirmation: yes(t.awaiting_confirmation), state: states[t.doc_code] || 'missing'
  }));
  const groups = BASES.map(basis => ({ basis, rows: rows.filter(r => r.basis === basis) })).filter(g => g.rows.length);
  return {
    segment, groups, location_note: !hasShortlist,
    progress: { present: rows.filter(r => r.state === 'present').length, total: rows.length }
  };
}

/** Every doc_code of a kit (used to refuse uploads of codes outside it). */
export const kitCodes = (kit) => new Set(kit.groups.flatMap(g => g.rows.map(r => r.doc_code)));
