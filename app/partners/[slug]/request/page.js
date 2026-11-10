import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '../../../../lib/auth/session.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import { getProfile } from '../../../../lib/db/partners.js';
import { listProjects } from '../../../../lib/db/projects.js';
import { isSlug } from '../../../../lib/api/partners.js';
import { eligibleProjects } from '../../../requests/request-view.js';
import RequestForm from './request-form.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('requests.form.title')} · CINEMATCH` };
}

/** SC-23 Send collaboration request (/partners/[slug]/request), M4 FR-012: producers of a project; guests sign in first. */
export default async function SendRequestPage({ params }) {
  if (!isSlug(params.slug)) notFound();
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/partners/${params.slug}/request`)}`);
  const { t } = await getI18n();
  const profile = await getProfile(session, params.slug).catch((e) => (e?.code === 'NOT_FOUND' ? null : Promise.reject(e)));
  if (!profile) notFound();
  const projects = session.role === 'member' ? eligibleProjects((await listProjects(session).catch(() => ({ projects: [] }))).projects || []) : [];
  return (
    <RequestForm
      org={{ org_id: profile.public.org_id, slug: profile.public.slug, org_name: profile.public.org_name, service_groups: profile.public.service_groups,
        provinces: profile.public.provinces, verified: profile.public.verified, art13_eligible: profile.public.art13_eligible, active: profile.public.active,
        working_languages: profile.member?.working_languages || [] }}
      projects={projects.map(p => ({ project_id: p.project_id, project_name: p.project_name, format: p.format, segment: p.segment, shoot_date: p.shoot_date }))}
      title={t('requests.form.title')}
    />
  );
}
