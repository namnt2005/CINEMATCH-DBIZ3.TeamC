import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getProject } from '../../../../lib/db/projects.js';
import { getKit } from '../../../../lib/db/documents.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import ProjectNav from '../project-nav.js';
import DocumentsClient from './documents-client.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('documents.meta.title')} · CINEMATCH` };
}

/** SC-26 Document kit by segment (/projects/[id]/documents), M5 FR-001..FR-003: project members; owner and edit upload. */
export default async function DocumentsPage({ params, searchParams }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/projects/${params.id}/documents`)}`);
  const { t } = await getI18n();
  const project = await getProject(session, params.id).catch(() => null);
  if (!project) return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('dashboard.not_found')}</p><a href="/projects">{t('dashboard.nav.back')}</a></main>;
  const segment = typeof searchParams?.segment === 'string' ? searchParams.segment : null;
  const kit = await getKit(session, params.id, { segment }).catch(() => (segment ? getKit(session, params.id).catch(() => null) : null));
  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
      <ProjectNav t={t} projectId={params.id} current="documents" />
      <DocumentsClient projectId={params.id} projectName={project.project_name} kit={kit ? JSON.parse(JSON.stringify(kit)) : null} />
    </div>
  );
}
