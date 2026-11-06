import { headers } from 'next/headers';
import { getSession } from '../../../lib/auth/session.js';
import { getI18n } from '../../../lib/i18n/server.js';
import { listVerificationQueue } from '../../../lib/db/verification.js';
import { getAllProvinces } from '../../../lib/db/locations.js';
import VerificationQueue from './verification-queue.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('queue.meta.title')} · CINEMATCH` };
}

/** SC-36 Admin — Verification queue (/admin/verification), M4 FR-009, FR-010, Q3: vfda_staff and admin only (SR-351). */
export default async function VerificationQueuePage() {
  const session = await getSession({ headers: headers() });
  const { t } = await getI18n();
  if (!['vfda_staff', 'admin'].includes(session.role)) {
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827' }}>{t('admin.staff_only.title')}</h1>
        <p style={{ color: '#b91c1c' }}>{t('admin.staff_only.text')}</p>
        <a href="/login?next=%2Fadmin%2Fverification" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('admin.staff_only.login')}</a>
      </div>
    );
  }
  const queue = await listVerificationQueue(session, { status: 'pending' }).catch(() => ({ counts: { pending: 0, approved: 0, rejected: 0 }, oldest_pending_days: null, requests: [] }));
  const provinces = Object.fromEntries((await getAllProvinces().catch(() => [])).map(p => [Number(p.province_id), p.name]));
  return <VerificationQueue initial={JSON.parse(JSON.stringify(queue))} provinces={provinces} />;
}
