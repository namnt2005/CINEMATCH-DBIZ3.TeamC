import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getProject } from '../../../../lib/db/projects.js';
import { getTimeline } from '../../../../lib/db/timeline.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import TimelineClient from './timeline-client.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('timeline.meta.title')} · CINEMATCH` };
}

/** SC-29 20-day countdown (/projects/[id]/timeline), M2 FR-017, FR-018, BR-006: project members; owner/edit change date and buffer. */
export default async function TimelinePage({ params }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/projects/${params.id}/timeline`)}`);
  const { t } = await getI18n();
  const project = await getProject(session, params.id).catch(() => null);
  if (!project) return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('dashboard.not_found')}</p><a href="/projects">{t('dashboard.nav.back')}</a></main>;
  const timeline = await getTimeline(session, params.id).catch(() => null);
  return <TimelineClient project={{ project_id: project.project_id, project_name: project.project_name, permission: project.permission, stage: project.stage }} initial={timeline ? JSON.parse(JSON.stringify(timeline)) : null} />;
}
