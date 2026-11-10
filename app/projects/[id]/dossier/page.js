import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getProject } from '../../../../lib/db/projects.js';
import { getDossier } from '../../../../lib/db/dossier.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import { stateView } from '../../../../lib/dossier/check.js';
import ProjectNav from '../project-nav.js';
import DossierDeadline from './dossier-deadline.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('dossier.meta.title')} · CINEMATCH` };
}

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const STATE_COLOR = { present: C.green, needs_fix: C.amber, pending: C.amber, missing: C.red };
// Narrow screens: the table becomes stacked cards (SC-27 §8); compact CSS with child selectors only
const CSS = '@media(max-width:600px){.dz-table>thead{display:none}.dz-table,.dz-table>tbody,.dz-table>tbody>tr,.dz-table>tbody>tr>td{display:block;width:100%}.dz-table>tbody>tr{border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px}}';
const time = (iso) => (iso ? `${String(iso).slice(11, 16)} ${String(iso).slice(0, 10).split('-').reverse().join('/')}` : '');

/** SC-27 Article 13 dossier completeness check (/projects/[id]/dossier), M2 FR-008..FR-010, BR-005: project members. */
export default async function DossierPage({ params }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/projects/${params.id}/dossier`)}`);
  const { t, locale } = await getI18n();
  const project = await getProject(session, params.id).catch(() => null);
  if (!project) return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('dashboard.not_found')}</p><a href="/projects">{t('dashboard.nav.back')}</a></main>;
  const d = await getDossier(session, params.id).catch(() => null);
  const href = (c) => (c.action === 'dossier.action.view_request' ? `/requests?project=${params.id}` : c.action === 'dossier.action.template' && c.template_url ? c.template_url : null);
  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
      <style>{CSS}</style>
      <ProjectNav t={t} projectId={params.id} current="dossier" />
      <main style={{ gridColumn: 'span 3', minWidth: 0, display: 'grid', gap: '1rem' }}>
        <header>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: C.navy }}>{t('dossier.title')} · {project.project_name}</h1>
          {d?.checked_at ? <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{t('dossier.basis', { time: time(d.checked_at) })}</p> : null}
        </header>
        {!d ? <p role="alert" style={{ color: C.red }}>{t('dossier.error')} <a href={`/projects/${params.id}/dossier`} style={{ color: C.blue }}>{t('dossier.rerun')}</a></p>
          : !d.applies ? <p style={box}>{t('dossier.segment_c')}</p> : (
            <>
              <section style={box} aria-labelledby="progress">
                <h2 id="progress" style={{ fontSize: '1rem', margin: 0 }}>{t('dossier.progress', { present: d.present })}</h2>
                <div aria-hidden="true" style={{ height: '0.5rem', background: C.border, borderRadius: '0.25rem', marginTop: '0.5rem' }}>
                  <div style={{ width: `${d.completeness_pct}%`, height: '100%', background: d.present === 4 ? C.green : C.navy, borderRadius: '0.25rem' }} />
                </div>
                <p role="status" style={{ margin: '0.75rem 0 0', fontWeight: 700, color: d.verdict === 'complete' ? C.green : C.red }}>{t(`dossier.verdict.${d.verdict}`)}</p>
              </section>
              <table className="dz-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                <thead><tr>{['component', 'state', 'details', 'action'].map(k => <th key={k} scope="col" style={{ textAlign: 'left', padding: '0.5rem', borderBottom: `1px solid ${C.border}`, fontSize: '0.875rem' }}>{t(`dossier.col.${k}`)}</th>)}</tr></thead>
                <tbody>
                  {d.components.map(c => {
                    const s = stateView(c.state);
                    const link = href(c);
                    return (
                      <tr key={c.doc_code} style={{ borderBottom: `1px solid ${C.border}`, verticalAlign: 'top' }}>
                        <td style={{ padding: '0.5rem' }}><strong>{c.letter}.</strong> {locale === 'en' ? c.name_en : c.name_vi}{c.form ? <span style={{ display: 'block', fontSize: '0.8125rem', color: C.muted }}>{t(c.form)}</span> : null}</td>
                        <td style={{ padding: '0.5rem', color: STATE_COLOR[c.state], fontWeight: 600 }}><span aria-hidden="true">{s.icon}</span> {t(s.key)}{c.reason ? <span style={{ display: 'block', fontWeight: 400, fontSize: '0.8125rem', color: C.muted }}>{t(c.reason)}</span> : null}</td>
                        <td style={{ padding: '0.5rem', fontSize: '0.8125rem' }}>
                          <span style={{ display: 'block', fontWeight: 600 }}>{t('dossier.auto.title')}</span>{c.auto_checked.map(k => <span key={k} style={{ display: 'block' }}>{t(k)}</span>)}
                          <span style={{ display: 'block', fontWeight: 600, marginTop: '0.25rem' }}>{t('dossier.person.title')}</span>{c.needs_person.map(k => <span key={k} style={{ display: 'block' }}>{t(k)}</span>)}
                        </td>
                        <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>
                          {link ? <a href={link} style={{ color: C.blue }}>{t(c.action)}</a> : <span>{t(c.action)} · {t('dossier.soon')}</span>}
                          {c.action === 'dossier.action.template' ? <span style={{ display: 'block', fontSize: '0.75rem', color: C.muted }}>{t('dossier.template_pending')}</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <DossierDeadline projectId={params.id} />
            </>
          )}
        <section style={box} aria-labelledby="where">
          <h2 id="where" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('dossier.where.title')}</h2>
          <p style={{ margin: 0 }}>{t('dossier.where.text')}</p>
        </section>
        <p style={{ margin: 0 }}><a href={`/projects/${params.id}/dossier`} style={{ color: C.blue }}>{t('dossier.rerun')}</a></p>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('dossier.disclaimer')}</p>
      </main>
    </div>
  );
}
