import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getProject } from '../../../../lib/db/projects.js';
import { listNotices } from '../../../../lib/db/notices.js';
import { getPublishedLocations } from '../../../../lib/db/locations.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import ProvincesClient from './provinces-client.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('notices.meta.title')} · CINEMATCH` };
}

/** SC-32 Provincial notices, member side (/projects/[id]/provinces): members of the project only (M7 FR-004). */
export default async function ProvincesPage({ params }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/projects/${params.id}/provinces`)}`);
  const { t } = await getI18n();
  const project = await getProject(session, params.id).catch(() => null);
  if (!project) {
    return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('dashboard.not_found')}</p><a href="/projects">{t('dashboard.nav.back')}</a></main>;
  }
  const { notices } = await listNotices(session, params.id).catch(() => ({ notices: [] }));
  const locations = (await getPublishedLocations().catch(() => []))
    .map(l => ({ location_id: l.location_id, name_en: l.name_en, name_vi: l.name_vi, province_id: Number(l.province_id), province_name: l.province_name }));
  return (
    <ProvincesClient
      project={{ project_id: project.project_id, project_name: project.project_name, permission: project.permission, stage: project.stage }}
      initialNotices={notices}
      locations={locations}
    />
  );
}
