import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getPrecheck } from '../../../../lib/db/precheck.js';
import { listProjects } from '../../../../lib/db/projects.js';
import { isUuid } from '../../../../lib/api/projects.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import ResultView from './result-view.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('precheck.result.meta.title')} · CINEMATCH` };
}

/** SC-48 Content check results (/pre-check/r/[id]), M2 FR-006, FR-012..FR-014: anyone with the link. */
export default async function ResultPage({ params }) {
  const { t } = await getI18n();
  const stored = isUuid(params.id) ? await getPrecheck(params.id).catch(() => null) : null;
  if (!stored) return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('precheck.not_found')}</p><a href="/pre-check">{t('precheck.edit')}</a></main>;
  const session = await getSession({ headers: headers() });
  const signedIn = Boolean(session.isAuthenticated && session.userId);
  const projects = signedIn
    ? ((await listProjects(session).catch(() => ({ projects: [] }))).projects || [])
      .filter(p => ['owner', 'edit'].includes(p.permission) && p.stage !== 'archived').map(p => ({ project_id: p.project_id, project_name: p.project_name }))
    : [];
  return <ResultView stored={JSON.parse(JSON.stringify(stored))} signedIn={signedIn} projects={projects} />;
}
