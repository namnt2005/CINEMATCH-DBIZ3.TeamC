import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth/session.js';
import { getI18n } from '../../../lib/i18n/server.js';
import { getMyOrganisation } from '../../../lib/db/partners.js';
import { getAllProvinces } from '../../../lib/db/locations.js';
import OrgForm from './org-form.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('org.meta.title')} · CINEMATCH` };
}

/** SC-21 My organisation profile (/partners/me), M4 FR-001: role partner, the organisation it acts for (D1). */
export default async function MyOrganisationPage() {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect('/login?next=%2Fpartners%2Fme');
  const { t } = await getI18n();
  const mine = session.role === 'partner' ? await getMyOrganisation(session).catch(() => null) : null;
  if (!mine) return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('org.not_partner')}</p></main>;
  const provinces = (await getAllProvinces().catch(() => [])).map(p => ({ province_id: Number(p.province_id), name: p.name }));
  return <OrgForm initial={JSON.parse(JSON.stringify(mine))} provinces={provinces} />;
}
