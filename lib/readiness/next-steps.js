// Next-step sentences of the dashboard (M0 BR-003, FR-007, research R4). Display only: the action code is
// chosen by v_project_readiness; this maps it to the dictionary and fills the names and the count.

export const GAUGES = Object.freeze(['content', 'locations', 'partners', 'dossier', 'logistics']);

/** Missing Article 13 component names, in the page language, from document_type (US-2 Scenario 1). */
export function missingComponents(row, documentTypes, locale) {
  const codes = String(row?.dossier_missing || '').split(',').filter(Boolean);
  return codes.map((code) => {
    const type = documentTypes.find(d => d.doc_code === code);
    return type ? (locale === 'en' ? type.name_en : type.name_vi) : code;
  });
}

/**
 * The one next-step sentence of a gauge, or null when the gauge is not shown for the segment (BR-002).
 * @param {(key: string, vars?: object) => string} t translator of the page language
 */
export function nextStepText(t, gauge, row, documentTypes = [], locale = 'vi') {
  const code = row?.[`${gauge}_action`];
  if (!code) return null;
  if (code === 'content.review_findings') return t(`dashboard.next.${code}`, { count: Number(row.content_open_findings) || 0 });
  if (code === 'dossier.add_missing') return t(`dashboard.next.${code}`, { items: missingComponents(row, documentTypes, locale).join('; ') });
  return t(`dashboard.next.${code}`);
}
