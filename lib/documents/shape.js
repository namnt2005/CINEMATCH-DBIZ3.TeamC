// The SC-26 answer from the rows both data sources read (M5 FR-001..FR-003, SR-153; specs/009-m5-dossier R1, R2, G1).
// States: the stored slot; the four Article 13 rows from M2's v_dossier_check (the same as SC-27); the provincial
// notice copy from M7 (an approved notice of the project has been downloaded). The kit itself is lib/documents/kit.js.
import { documentKit } from './kit.js';
import { rowActions, FROM_M7 } from './view.js';
import { CheckError } from '../checks/errors.js';

export const SEGMENTS = Object.freeze(['A', 'B', 'C']);

export function validSegment(segment) {
  if (segment == null || segment === '') return null;
  if (!SEGMENTS.includes(segment)) throw new CheckError('VALIDATION_ERROR', { segment: 'documents.error.segment' });
  return segment;
}

/**
 * @param project      { project_id, segment, stage }
 * @param permission   'owner' | 'edit' | 'view'
 * @param rows         { requirements, types, shortlistIds, links, slots, dossier, noticeDone, documents, names }
 */
export function shapeKit({ project, permission, viewing = null, rows }) {
  const segment = viewing || project.segment;
  const shortlist = new Set(rows.shortlistIds);
  const states = Object.fromEntries(rows.slots.map(s => [s.doc_code, s.state]));
  for (const d of rows.dossier) states[d.doc_code] = d.state;
  states[FROM_M7] = rows.noticeDone ? 'present' : 'missing';
  const kit = documentKit({
    segment, requirements: rows.requirements, types: rows.types, hasShortlist: shortlist.size > 0, states,
    locationDocs: rows.links.filter(l => shortlist.has(l.location_id)).map(l => l.doc_code)
  });
  const editable = ['owner', 'edit'].includes(permission) && project.stage !== 'archived' && segment === project.segment;
  const versions = (code) => rows.documents.filter(d => d.doc_code === code).sort((a, b) => b.version - a.version)
    .map(d => ({ document_id: d.document_id, version: Number(d.version), uploaded_at: d.uploaded_at, uploaded_by_name: rows.names[d.uploaded_by] ?? null }));
  const groups = kit.groups.map(g => ({
    basis: g.basis,
    rows: g.rows.map(r => {
      const all = versions(r.doc_code);
      const row = { ...r, latest: all[0] ?? null, versions: all.length };
      return { ...row, actions: rowActions(row, { editable }) };
    })
  }));
  // SC-26 #11: what each segment needs, from segment_requirement (the GAUGE_* rows switch M0's gauges, they are no document)
  const differences = rows.requirements.filter(r => !String(r.requirement_code).startsWith('GAUGE_'))
    .map(r => ({ segment: r.segment, requirement_code: r.requirement_code, label_vi: r.label_vi, label_en: r.label_en, needed: r.needed === true || r.needed === 'true' }))
    .sort((a, b) => (a.requirement_code === b.requirement_code ? (a.segment < b.segment ? -1 : 1) : a.requirement_code < b.requirement_code ? -1 : 1));
  return { project_id: project.project_id, segment: project.segment, viewing_segment: segment, editable, groups,
    progress: kit.progress, differences, location_note: kit.location_note };
}
