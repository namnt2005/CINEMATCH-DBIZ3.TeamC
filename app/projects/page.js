import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../lib/auth/session.js';
import { listProjects, listInvitations } from '../../lib/db/projects.js';
import { listProvinces } from '../../lib/db/provinces.js';
import { listArticle13Types } from '../../lib/db/document-types.js';
import { getI18n } from '../../lib/i18n/server.js';
import { todayInVietnam } from '../../lib/projects/input.js';
import ProjectsClient from './projects-client.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('projects.meta.title')} · CINEMATCH` };
}

/** SC-10 My projects (/projects, ?new=1&segment=, ?stage=): signed-in members only (FR-001, FR-003). */
export default async function ProjectsPage({ searchParams }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) {
    const query = new URLSearchParams(searchParams || {}).toString();
    redirect(`/login?next=${encodeURIComponent(`/projects${query ? `?${query}` : ''}`)}`);
  }
  let lists = null;
  try {
    const [open, archived, invitations] = await Promise.all([
      listProjects(session), listProjects(session, { stage: 'archived' }), listInvitations(session)
    ]);
    lists = { counts: open.counts, projects: [...open.projects, ...archived.projects], invitations };
  } catch {
    lists = null; // Error state with Try again
  }
  const [provinces, documentTypes] = await Promise.all([listProvinces().catch(() => []), listArticle13Types().catch(() => [])]);
  return <ProjectsClient initial={lists} provinces={provinces} documentTypes={documentTypes} today={todayInVietnam()} />;
}
