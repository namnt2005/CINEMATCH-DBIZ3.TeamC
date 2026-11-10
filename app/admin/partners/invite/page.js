import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import { listInvitations, listInvitableOrganisations } from '../../../../lib/db/partner-invitations.js';
import { getAllProvinces } from '../../../../lib/db/locations.js';
import InviteForm from './invite-form.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('invitations.meta.title')} · CINEMATCH` };
}

/** Invite a partner (/admin/partners/invite), M4 BR-003: vfda_staff and admin only; no Screen Spec (research Open question 9). */
export default async function InvitePartnerPage() {
  const session = await getSession({ headers: headers() });
  const { t } = await getI18n();
  if (!['vfda_staff', 'admin'].includes(session.role)) {
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827' }}>{t('admin.staff_only.title')}</h1>
        <p style={{ color: '#b91c1c' }}>{t('admin.staff_only.text')}</p>
        <a href="/login?next=%2Fadmin%2Fpartners%2Finvite" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('admin.staff_only.login')}</a>
      </div>
    );
  }
  const [organisations, list, provinces] = await Promise.all([
    listInvitableOrganisations(session).catch(() => []),
    listInvitations(session).catch(() => ({ invitations: [] })),
    getAllProvinces().catch(() => [])
  ]);
  return <InviteForm organisations={JSON.parse(JSON.stringify(organisations))} initial={JSON.parse(JSON.stringify(list.invitations))}
    provinces={provinces.map(p => ({ province_id: Number(p.province_id), name: p.name }))} />;
}
