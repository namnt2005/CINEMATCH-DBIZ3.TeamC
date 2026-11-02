import { headers } from 'next/headers';
import { getSession } from '../../../lib/auth/session.js';
import { getI18n } from '../../../lib/i18n/server.js';
import { getAllProvinces } from '../../../lib/db/locations.js';
import { getProfileName } from '../../../lib/db/profiles.js';
import AdminLocationsClient from './admin-locations-client.js';

/**
 * SC-35 Admin — Locations (/admin/locations), M3 US-3.
 * vfda_staff only (SC-35 #7; admin inherits, D5). The role comes from the Supabase session (@supabase/ssr);
 * without Supabase, from MOCK_AUTH_DEFAULT_ROLE on the dev server (x-mock-role counts only in `npm test`).
 */
export default async function AdminLocationsPage() {
  const session = await getSession({ headers: headers() });

  if (!['vfda_staff', 'admin'].includes(session.role)) {
    // The middleware already sends guests to /login and others get 403; this is the last line of defence
    const { t } = await getI18n();
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827' }}>{t('admin.staff_only.title')}</h1>
        <p style={{ color: '#b91c1c' }}>{t('admin.staff_only.text')}</p>
        <a href="/login?next=%2Fadmin%2Flocations" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('admin.staff_only.login')}</a>
      </div>
    );
  }

  const provinces = (await getAllProvinces()).map(p => ({ province_id: Number(p.province_id), name: p.name }));
  const staffName = await getProfileName(session.userId);

  return <AdminLocationsClient provinces={provinces} staffName={staffName || 'VFDA staff'} />;
}
