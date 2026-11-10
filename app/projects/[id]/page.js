import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../../lib/auth/session.js';
import { getProject } from '../../../lib/db/projects.js';
import { getRouterData } from '../../../lib/db/router.js';
import { listArticle13Types } from '../../../lib/db/document-types.js';
import { getI18n } from '../../../lib/i18n/server.js';
import { todayInVietnam } from '../../../lib/projects/input.js';
import { getTimeline } from '../../../lib/db/timeline.js';
import DashboardClient from './dashboard-client.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('dashboard.overall')} · CINEMATCH` };
}

/** SC-12 Readiness dashboard (/projects/[id]): members only; every number from v_project_readiness (BR-001). */
export default async function DashboardPage({ params, searchParams }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/projects/${params.id}`)}`);
  const { t } = await getI18n();
  const project = await getProject(session, params.id).catch(() => null);
  if (!project) {
    return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('dashboard.not_found')}</p><a href="/projects">{t('dashboard.nav.back')}</a></main>;
  }
  const [{ requirements }, documentTypes, timeline] = await Promise.all([getRouterData(), listArticle13Types().catch(() => []),
    getTimeline(session, params.id).catch(() => null)]);  // SC-12 #10 deadline strip: the same function as SC-29 (SR-173, M2 D13)
  return (
    <DashboardClient
      project={project}
      requirements={requirements.filter(r => r.segment === project.segment && r.requirement_code.startsWith('GAUGE_'))}
      documentTypes={documentTypes}
      today={todayInVietnam()}
      timeline={timeline ? JSON.parse(JSON.stringify(timeline)) : null}
      created={searchParams?.created === '1'}
    />
  );
}
