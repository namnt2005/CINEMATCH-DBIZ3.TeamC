import { headers } from 'next/headers';
import { getSession } from '../../../lib/auth/session.js';
import { getAllProvinces } from '../../../lib/db/locations.js';
import { getProfileName } from '../../../lib/db/profiles.js';
import AdminLocationsClient from './admin-locations-client.js';

/**
 * SC-35 Admin — Locations (/admin/locations), M3 US-3.
 * vfda_staff only (SC-35 #7). Until the SYS sign-in slice the role comes from x-mock-role or, on the
 * dev server, MOCK_AUTH_DEFAULT_ROLE (specs/002-m3-publish/research.md R4).
 */
export default async function AdminLocationsPage() {
  const session = await getSession({ headers: headers() });

  if (!['vfda_staff', 'admin'].includes(session.role)) {
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827' }}>Admin — Locations</h1>
        <p style={{ color: '#b91c1c' }}>This screen is for VFDA staff only.</p>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Local development: send <code>x-mock-role: vfda_staff</code>, or start the server with{' '}
          <code>MOCK_AUTH_DEFAULT_ROLE=vfda_staff</code>.
        </p>
      </div>
    );
  }

  const provinces = (await getAllProvinces()).map(p => ({ province_id: Number(p.province_id), name: p.name }));
  const staffName = await getProfileName(session.userId);

  return <AdminLocationsClient provinces={provinces} staffName={staffName || 'VFDA staff'} />;
}
