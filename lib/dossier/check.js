// The Article 13 dossier check shaped for SC-27 (M2 FR-008, FR-009, BR-005, SC-27 SR-081..SR-086, Clarifications Q9).
// Fixed rules only: the states come from v_dossier_check; this adds the order a–d, the verdict, what was checked
// automatically and what needs a person (SR-083: nothing here declares a signature or seal valid), and the action.

export const COMPONENTS = Object.freeze([
  { doc_code: 'A13_APPLICATION', letter: 'a', form: 'dossier.form.application',
    auto: ['dossier.auto.file_uploaded'], person: ['dossier.person.form_filled', 'dossier.person.signature_seal'] },
  { doc_code: 'A13_SCRIPT_VI', letter: 'b', form: null,
    auto: ['dossier.auto.file_uploaded', 'dossier.auto.paragraphs_proofread'], person: ['dossier.person.translation_quality'] },
  { doc_code: 'A13_SERVICE_AGREEMENT', letter: 'c', form: null,
    auto: ['dossier.auto.file_uploaded', 'dossier.auto.request_confirmed'], person: ['dossier.person.agreement_terms', 'dossier.person.signature_seal'] },
  { doc_code: 'A13_ART9_COMMITMENT', letter: 'd', form: 'dossier.form.commitment',
    auto: ['dossier.auto.file_uploaded'], person: ['dossier.person.signature_seal'] }
]);

const ICONS = { present: '✓', needs_fix: '✎', pending: '…', missing: '○' };
export const stateView = (state) => ({ icon: ICONS[state] ?? '○', key: `dossier.state.${ICONS[state] ? state : 'missing'}` });

function actionOf(c, state) {
  if (c.doc_code === 'A13_SCRIPT_VI') return 'dossier.action.draft_vi';
  if (c.doc_code === 'A13_SERVICE_AGREEMENT') return 'dossier.action.view_request';
  return state === 'present' ? 'dossier.action.view_file' : 'dossier.action.template';
}

function reasonOf(row) {
  if (row.state === row.stored_state) return null;
  if (row.doc_code === 'A13_SCRIPT_VI' && row.state === 'needs_fix') return 'dossier.reason.paragraphs_open';
  if (row.doc_code === 'A13_SERVICE_AGREEMENT' && row.state === 'pending') return 'dossier.reason.request_not_confirmed';
  return null;
}

/** SC-27 data from the project (segment), the v_dossier_check rows of that project and the document types. */
export function shapeDossier(project, rows, types, checkedAt) {
  const applies = rows.length > 0 && project.segment !== 'C';
  if (!applies) return { segment: project.segment, applies: false, checked_at: checkedAt, present: 0, total: 4, completeness_pct: null, verdict: null, components: [] };
  const byCode = Object.fromEntries(rows.map(r => [r.doc_code, r]));
  const typeOf = Object.fromEntries(types.map(t => [t.doc_code, t]));
  const components = COMPONENTS.map((c) => {
    const row = byCode[c.doc_code] ?? { doc_code: c.doc_code, state: 'missing', stored_state: 'missing' };
    const type = typeOf[c.doc_code] ?? {};
    return {
      letter: c.letter, doc_code: c.doc_code, name_vi: type.name_vi ?? c.doc_code, name_en: type.name_en ?? c.doc_code,
      state: row.state, reason: reasonOf(row), form: c.form, auto_checked: c.auto, needs_person: c.person,
      action: actionOf(c, row.state), template_url: type.template_url ?? null
    };
  });
  const present = components.filter(c => c.state === 'present').length;
  return { segment: project.segment, applies: true, checked_at: checkedAt, present, total: 4, completeness_pct: 25 * present,
    verdict: present === 4 ? 'complete' : 'not_ready', components };
}
