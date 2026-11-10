import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getProject } from '../../../../lib/db/projects.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import { todayInVietnam } from '../../../../lib/projects/input.js';
import SettingsClient from './settings-client.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('settings.title')} · CINEMATCH` };
}

/** SC-13 Project settings (/projects/[id]/settings): members only; edits through the M0 functions (FR-002, FR-004). */
export default async function SettingsPage({ params }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/projects/${params.id}/settings`)}`);
  const { t } = await getI18n();
  const project = await getProject(session, params.id).catch(() => null);
  if (!project) {
    return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('dashboard.not_found')}</p><a href="/projects">{t('dashboard.nav.back')}</a></main>;
  }
  return <SettingsClient project={project} userId={session.userId} today={todayInVietnam()} />;
}
