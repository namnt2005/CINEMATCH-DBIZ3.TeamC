import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getLocationDetail } from '../../../lib/db/location-detail.js';
import { resolveSessionRole } from '../../../lib/auth/session.js';
import { canSeeAuthorityContact, getAuthorityContact } from '../../../lib/db/contacts.js';
import { noDataLabel, nightShootingLabel, rainyMonthsLabel, monthsToAvoidLabel } from '../../../lib/locations/season-facts.js';
import LocationMap from '../../components/map/location-map.js';
import LocationPhoto from './location-photo.js';

// SC-16 #4 labels (M3 BR-010)
const AVAILABILITY = {
  open: { label: 'Open', bg: '#e0f2fe', color: '#0369a1' },
  survey_in_progress: { label: 'Scouting crew on site', bg: '#fef3c7', color: '#92400e' },
  paused: { label: 'Temporarily closed', bg: '#fee2e2', color: '#b91c1c' }
};

// Empty fields read "no data yet", never "no" (BR-003, SR-113)
const NO_DATA = noDataLabel('vi');

const CREW_CAPACITY = { u15: 'Dưới 15 người', '15_50': '15–50 người', o50: 'Trên 50 người' };
const PERMIT_COMPLEXITY = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' };

function yesNo(value) {
  if (value === true) return 'Có';
  if (value === false) return 'Không';
  return NO_DATA;
}

function fromMap(map, value) {
  return map[value] || NO_DATA;
}

// verified_at is stored with its own offset; show the calendar date as written (DD/MM/YYYY)
function verifiedDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : NO_DATA;
}

function FactBlock({ title, facts }) {
  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem', backgroundColor: '#ffffff' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: '0 0 0.75rem' }}>{title}</h2>
      <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 2fr', gap: '0.5rem 1rem', margin: 0, fontSize: '0.875rem' }}>
        {facts.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ color: '#6b7280' }}>{label}</dt>
            <dd style={{ margin: 0, color: value === NO_DATA ? '#9ca3af' : '#111827', fontStyle: value === NO_DATA ? 'italic' : 'normal' }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * SC-16 Location detail — header, scene types, availability, approved photos (F-M3-13),
 * Logistics (#8), Seasons and permits (#9), the local authority contact (#10)
 * and the mini map with nearby locations (#12). The province index (#11) is not built yet.
 */
export default function LocationDetailPage({ params }) {
  const location = getLocationDetail(params.slug);
  if (!location) notFound();

  // Guests never reach authority_contact, so the page source holds no phone number (BR-005, SR-111, SC-004)
  const session = resolveSessionRole(headers());
  const contact = canSeeAuthorityContact(session) ? getAuthorityContact(location.location_id, session) : null;

  const availability = AVAILABILITY[location.availability];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <a href="/locations" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
        ← Back to location suggestions (SC-14)
      </a>

      {/* Names + province (SC-16 #5) and availability (SC-16 #4) */}
      <header style={{ marginTop: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              {location.name_en}
            </h1>
            <div style={{ fontSize: '1.125rem', color: '#374151', marginTop: '0.25rem' }}>
              {location.name_vi}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              {location.province.name}
            </div>
          </div>
          {availability && (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.625rem',
                borderRadius: '0.25rem',
                backgroundColor: availability.bg,
                color: availability.color,
                textTransform: 'uppercase',
                fontWeight: '600'
              }}
            >
              {availability.label}
            </span>
          )}
        </div>

        {/* Scene type chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          {location.scene_types.map(type => (
            <span
              key={type}
              style={{
                fontSize: '0.75rem',
                padding: '0.125rem 0.625rem',
                borderRadius: '9999px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #e5e7eb'
              }}
            >
              {type.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </header>

      {/* Photo gallery — approved photos only, each with source and usage right (SC-16 #3, FR-003) */}
      {location.images.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px dashed #d1d5db', color: '#6b7280' }}>
          No approved photos yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {location.images.map(image => (
            <LocationPhoto key={image.image_url} image={image} alt={location.name_en} />
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Logistics (SC-16 #8) */}
        <FactBlock
          title="Hậu cần"
          facts={[
            ['Quy mô đoàn', fromMap(CREW_CAPACITY, location.logistics.crew_capacity)],
            ['Cách sân bay', location.airport_km === null ? NO_DATA : `${location.airport_km} km`],
            ['Lưu trú trong 20 km', yesNo(location.logistics.lodging_20km)],
            ['Điện lưới', yesNo(location.logistics.grid_power)],
            ['Xe tải vào được', yesNo(location.logistics.truck_access)]
          ]}
        />

        {/* Seasons and permits (SC-16 #9) */}
        <FactBlock
          title="Mùa & giấy phép"
          facts={[
            ['Tháng nên tránh', monthsToAvoidLabel(location.season.months_to_avoid, 'vi')],
            ['Tháng mưa', rainyMonthsLabel(location.season.rainy_months, 'vi')],
            ['Quay đêm', nightShootingLabel(location.season.night_shooting_allowed, 'vi')],
            ['Độ phức tạp giấy phép', fromMap(PERMIT_COMPLEXITY, location.permit_complexity)],
            ['Lưu ý hạn chế', location.restriction_note || NO_DATA]
          ]}
        />

        {/* Local authority contact (SC-16 #10) */}
        {canSeeAuthorityContact(session) ? (
          <FactBlock
            title="Liên hệ chính quyền địa phương"
            facts={[
              ['Cơ quan', contact?.authority_name || NO_DATA],
              ['Người liên hệ', contact?.contact_name || NO_DATA],
              ['Điện thoại', contact?.contact_phone || NO_DATA],
              ['Ngày VFDA xác minh', verifiedDate(contact?.verified_at)]
            ]}
          />
        ) : (
          <section style={{ border: '1px dashed #d1d5db', borderRadius: '0.5rem', padding: '1.25rem', backgroundColor: '#f9fafb', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: '0 0 0.5rem' }}>Liên hệ chính quyền địa phương</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' }}>
              Thông tin liên hệ chỉ hiển thị cho thành viên đã đăng nhập.
            </p>
            <a
              href="/auth/signup"
              style={{
                display: 'inline-block',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '0.5rem 1.25rem',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Đăng nhập để xem
            </a>
          </section>
        )}
      </div>

      {/* Mini map + nearby published locations within 30 km (SC-16 #12, F-M3-14) */}
      <section style={{ marginTop: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem', backgroundColor: '#ffffff' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: '0 0 0.75rem' }}>Địa điểm gần đây</h2>
        <LocationMap center={location.coordinates} name={location.name_en} nearby={location.nearby_locations} />
        {location.nearby_locations.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.75rem 0 0' }}>
            Chưa có địa điểm đã đăng nào trong vòng 30 km.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0', fontSize: '0.875rem' }}>
            {location.nearby_locations.map(place => (
              <li key={place.slug} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.5rem 0', borderTop: '1px solid #f3f4f6' }}>
                <a href={`/locations/${place.slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                  {place.name_vi} <span style={{ color: '#6b7280' }}>({place.name_en})</span>
                </a>
                <span style={{ color: '#374151', whiteSpace: 'nowrap' }}>{place.distance_km.toLocaleString('vi-VN')} km</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
