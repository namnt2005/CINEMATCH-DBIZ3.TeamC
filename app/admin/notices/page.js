import { headers } from 'next/headers';
import { getSession } from '../../../lib/auth/session.js';
import { getI18n } from '../../../lib/i18n/server.js';
import { listStaffNotices } from '../../../lib/db/notices.js';
import NoticesQueue from './notices-queue.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('notices.staff.title')} · CINEMATCH` };
}

/**
 * SC-32 Provincial notices, VFDA side (/admin/notices), M7 BR-001 and D3: the review queue (Approve / Request
 * changes) and the province's reply. vfda_staff only (admin inherits); the middleware guards /admin first.
 */
export default async function AdminNoticesPage() {
  const session = await getSession({ headers: headers() });
  if (!['vfda_staff', 'admin'].includes(session.role)) {
    const { t } = await getI18n();
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827' }}>{t('admin.staff_only.title')}</h1>
        <p style={{ color: '#b91c1c' }}>{t('admin.staff_only.text')}</p>
        <a href="/login?next=%2Fadmin%2Fnotices" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('admin.staff_only.login')}</a>
      </div>
    );
  }
  const { notices } = await listStaffNotices(session, { status: 'submitted' }).catch(() => ({ notices: [] }));
  return <NoticesQueue initialNotices={notices} />;
}
