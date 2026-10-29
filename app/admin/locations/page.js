import { headers } from 'next/headers';
import { resolveSessionRole } from '../../../lib/auth/session.js';
import { getAllProvinces } from '../../../lib/db/locations.js';
import { getOne } from '../../../lib/db/client.js';
import AdminLocationsClient from './admin-locations-client.js';

/**
 * SC-35 Admin — Locations (/admin/locations), M3 US-3.
 * vfda_staff only (SC-35 #7). Until the SYS sign-in slice the role comes from x-mock-role or, on the
 * dev server, MOCK_AUTH_DEFAULT_ROLE (specs/002-m3-publish/research.md R4).
 */
export default function AdminLocationsPage() {
  const session = resolveSessionRole(headers());

  if (session.role !== 'vfda_staff') {
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

  const provinces = getAllProvinces().map(p => ({ province_id: Number(p.province_id), name: p.name }));
  const staff = getOne('SELECT full_name FROM profile WHERE user_id = ?', [session.userId]);

  return <AdminLocationsClient provinces={provinces} staffName={staff?.full_name || 'VFDA staff'} />;
}
