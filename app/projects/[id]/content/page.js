import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getProject } from '../../../../lib/db/projects.js';
import { latestContentCheck } from '../../../../lib/db/content-checks.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import ContentClient from './content-client.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('content.meta.title')} · CINEMATCH` };
}

/** SC-48 for a project (/projects/[id]/content), M2 FR-013, FR-014: members of the project (research R13, Open question 4). */
export default async function ContentPage({ params }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/projects/${params.id}/content`)}`);
  const { t } = await getI18n();
  const project = await getProject(session, params.id).catch(() => null);
  if (!project) return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('dashboard.not_found')}</p><a href="/projects">{t('dashboard.nav.back')}</a></main>;
  const run = await latestContentCheck(session, params.id).catch(() => ({ run_id: null, findings: [] }));
  return <ContentClient project={{ project_id: project.project_id, project_name: project.project_name, permission: project.permission, stage: project.stage }} initial={JSON.parse(JSON.stringify(run))} />;
}
