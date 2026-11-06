import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '../../lib/auth/session.js';
import { getI18n } from '../../lib/i18n/server.js';
import { listRequests } from '../../lib/db/collab.js';
import { getProject } from '../../lib/db/projects.js';
import ProjectNav from '../projects/[id]/project-nav.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('requests.meta.title')} · CINEMATCH` };
}

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb' };
const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

/** SC-25 request list (SC-24 in the screen list): one project (?project=), a member's outgoing list, a partner's inbox (FR-013). */
export default async function RequestsPage({ searchParams }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect('/login?next=%2Frequests');
  const { t } = await getI18n();
  const projectId = searchParams?.project || null;
  const scope = projectId ? { project_id: projectId } : { direction: session.role === 'partner' ? 'incoming' : 'outgoing' };
  const { requests } = await listRequests(session, scope).catch(() => ({ requests: [] }));
  const project = projectId ? await getProject(session, projectId).catch(() => null) : null;
  const heading = project ? t('requests.project_list', { project: project.project_name }) : t(session.role === 'partner' ? 'requests.incoming' : 'requests.outgoing');
  const list = (
    <div style={{ minWidth: 0 }}>
      <h1 style={{ fontSize: '1.5rem', margin: '0 0 1rem' }}>{heading}</h1>
      {requests.length === 0 ? (
        <p style={{ border: `1px dashed ${C.border}`, borderRadius: '0.75rem', padding: '1.5rem', color: C.muted }}>
          {t('requests.none')} {session.role === 'member' ? <a href="/partners" style={{ color: '#2563eb' }}>{t('requests.find_partner')}</a> : null}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.625rem' }}>
          {requests.map(r => (
            <li key={r.request_id} style={{ border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '0.875rem 1rem', background: '#fff' }}>
              <a href={`/requests/${r.request_id}`} style={{ color: '#111827', textDecoration: 'none', fontWeight: 600 }}>
                {session.role === 'partner' ? r.project.project_name : r.organisation.org_name}
              </a>
              <span style={{ display: 'block', fontSize: '0.8125rem', color: C.muted }}>
                {t(`requests.status.${r.status}`)} · {r.services.map(g => t(`partners.group.${g}`)).join(', ')} · {t('requests.sent_at', { date: vnDate(r.sent_at) })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: project ? 'repeat(auto-fit, minmax(min(100%, 12rem), auto))' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
      {project ? <ProjectNav t={t} projectId={project.project_id} current="partners" /> : null}
      {list}
    </main>
  );
}
