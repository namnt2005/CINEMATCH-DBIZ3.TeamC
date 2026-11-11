import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../../../../lib/auth/session.js';
import { getProject } from '../../../../../lib/db/projects.js';
import { getDraft, listDrafts } from '../../../../../lib/db/drafts.js';
import { getKit } from '../../../../../lib/db/documents.js';
import { getI18n } from '../../../../../lib/i18n/server.js';
import ProjectNav from '../../project-nav.js';
import DraftEditor from './draft-editor.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('drafts.meta.title')} · CINEMATCH` };
}

/**
 * SC-28 Bilingual draft editor (/projects/[id]/bilingual/[docCode]), M5 FR-004..FR-006: project members; the project's
 * partner behind M4's NDA gate (D4) proofreads and, once confirmed, confirms the whole document.
 */
export default async function BilingualPage({ params }) {
  const session = await getSession({ headers: headers() });
  const here = `/projects/${params.id}/bilingual/${params.docCode}`;
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(here)}`);
  const { t } = await getI18n();
  const draft = await getDraft(session, params.id, params.docCode).catch(() => null);
  if (!draft) return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('drafts.not_found')}</p><a href="/projects">{t('dashboard.nav.back')}</a></main>;
  const project = await getProject(session, params.id).catch(() => null);          // null for the partner: no project sidebar
  const [drafts, kit] = await Promise.all([listDrafts(session, params.id).catch(() => ({ drafts: [] })), project ? getKit(session, params.id).catch(() => null) : null]);
  const choices = kit ? kit.groups.flatMap(g => g.rows).map(r => ({ doc_code: r.doc_code, name_vi: r.name_vi, name_en: r.name_en })) : [];
  const editor = <DraftEditor projectId={params.id} docCode={params.docCode} projectName={project?.project_name ?? null}
    draft={JSON.parse(JSON.stringify(draft))} drafts={drafts.drafts} choices={choices} />;
  if (!project) return <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>{editor}</div>;
  return (
    <div style={{ maxWidth: '1300px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
      <ProjectNav t={t} projectId={params.id} current="drafts" />
      <div style={{ gridColumn: 'span 4', minWidth: 0 }}>{editor}</div>
    </div>
  );
}
