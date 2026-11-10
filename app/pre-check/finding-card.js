'use client';
// One finding card of SC-48 (#7–#10): severity label, title, citation and rule code, what the rule says and its
// *Points to consider* — all the signed rule's own words (SR-073); the Sample label for sample rules (D15).
import { useLocale, useT } from '../../lib/i18n/client.js';
import { severityKey } from '../../lib/content-check/view.js';

const C = { border: '#e5e7eb', muted: '#6b7280', red: '#b91c1c', amber: '#92400e', blue: '#2563eb' };

export default function FindingCard({ finding, children }) {
  const t = useT();
  const locale = useLocale();
  const vi = locale === 'vi';
  const color = finding.severity === 'action' ? C.red : C.amber;
  return (
    <li id={`finding-${finding.n}`} style={{ border: `1px solid ${C.border}`, borderLeft: `4px solid ${color}`, borderRadius: '0.5rem', padding: '0.75rem', background: '#fff', listStyle: 'none' }}>
      <p style={{ margin: 0, fontSize: '0.8125rem', color, fontWeight: 700 }}>{finding.n}. {t(severityKey(finding.severity))}</p>
      <h3 style={{ fontSize: '1rem', margin: '0.25rem 0' }}>{vi ? finding.title_vi : finding.title_en}</h3>
      {finding.is_sample ? <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: C.muted }}>{t('precheck.sample')}</p> : null}
      <p style={{ margin: 0, fontSize: '0.8125rem' }}>{t('precheck.card.citation')}: <span style={{ userSelect: 'text' }}>{finding.citation}</span> · {t('precheck.card.code')}: <a href={`/requirements/${String(finding.rule_code).toLowerCase()}`} style={{ color: C.blue }}>{finding.rule_code}</a></p>
      {finding.quoted_text ? <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}>{t('precheck.card.passage')}: <q>{finding.quoted_text}</q></p> : null}
      <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>{t('precheck.card.description')}:</strong> {vi ? finding.description_vi : finding.description_en}</p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}><strong>{t('precheck.card.guidance')}:</strong> {vi ? finding.guidance_vi : finding.guidance_en}</p>
      {children}
    </li>
  );
}
