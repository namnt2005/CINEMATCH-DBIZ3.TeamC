import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getLocationDetail } from '../../../lib/db/location-detail.js';
import { getSession } from '../../../lib/auth/session.js';
import { getI18n } from '../../../lib/i18n/server.js';
import { sceneLabel } from '../labels.js';
import { canSeeAuthorityContact, getAuthorityContact, isContactAccessDenied } from '../../../lib/db/contacts.js';
import { noDataLabel, nightShootingLabel, rainyMonthsLabel, monthsToAvoidLabel } from '../../../lib/locations/season-facts.js';
import LocationMap from '../../components/map/location-map.js';
import LocationPhoto from './location-photo.js';
import InterestButton from './interest-button.js';
import { listProjects } from '../../../lib/db/projects.js';

export const dynamic = 'force-dynamic';

// SC-16 #4 badge colours (M3 BR-010); the labels come from the dictionary
const AVAILABILITY = {
  open: { bg: '#e0f2fe', color: '#0369a1' },
  survey_in_progress: { bg: '#fef3c7', color: '#92400e' },
  paused: { bg: '#fee2e2', color: '#b91c1c' }
};

// Empty fields read "no data yet", never "no" (BR-003, SR-113); the page builds these with its language
function labels(t, locale) {
  const noData = noDataLabel(locale);
  return {
    noData,
    yesNo: (value) => (value === true ? t('detail.yes') : value === false ? t('detail.no') : noData),
    crew: (value) => (value ? t(`detail.crew.${value}`) : noData),
    permit: (value) => (value ? t(`detail.permit.${value}`) : noData),
    // verified_at is stored with its own offset; show the calendar date as written (DD/MM/YYYY)
    date: (value) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
      return match ? `${match[3]}/${match[2]}/${match[1]}` : noData;
    }
  };
}

function FactBlock({ title, facts, noData }) {
  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem', backgroundColor: '#ffffff' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: '0 0 0.75rem' }}>{title}</h2>
      <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 2fr', gap: '0.5rem 1rem', margin: 0, fontSize: '0.875rem' }}>
        {facts.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ color: '#6b7280' }}>{label}</dt>
            <dd style={{ margin: 0, color: value === noData ? '#9ca3af' : '#111827', fontStyle: value === noData ? 'italic' : 'normal' }}>
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
export default async function LocationDetailPage({ params }) {
  const location = await getLocationDetail(params.slug);
  if (!location) notFound();

  // Guests never reach authority_contact, so the page source holds no phone number (BR-005, SR-111, SC-004)
  // Supabase session from the cookies (@supabase/ssr); x-mock-role only counts in `npm test` (T073)
  const session = await getSession({ headers: headers() });
  const { t, locale } = await getI18n();
  const L = labels(t, locale);
  const NO_DATA = L.noData;
  // Back to this page after sign-in (SC-04 SR-025)
  const loginHref = `/login?next=${encodeURIComponent(`/locations/${location.slug}`)}`;
  let contact = null;
  let contactDenied = false;
  if (canSeeAuthorityContact(session)) {
    try {
      contact = await getAuthorityContact(location.location_id, session);
    } catch (err) {
      // The database refused the read (e.g. the session expired): show "no access", keep the page
      if (!isContactAccessDenied(err)) throw err;
      contactDenied = true;
    }
  }

  const availability = AVAILABILITY[location.availability];
  // M7 R10: the caller's projects for *I'm interested in this location* (members only; staff have none)
  const signedIn = Boolean(session.isAuthenticated && session.userId);
  const myProjects = signedIn
    ? ((await listProjects(session).catch(() => ({ projects: [] }))).projects || []).map(p => ({ project_id: p.project_id, project_name: p.project_name, permission: p.permission, stage: p.stage }))
    : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <a href="/locations" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
        ← {t('detail.back')}
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
            {['vfda_staff', 'admin'].includes(session.role) ? null : (
              <div style={{ marginTop: '0.75rem' }}>
                <InterestButton locationId={location.location_id} signedIn={signedIn} projects={myProjects} loginHref={loginHref} />
              </div>
            )}
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
              {t(`availability.${location.availability}`)}
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
              {sceneLabel(t, type)}
            </span>
          ))}
        </div>
      </header>

      {/* Photo gallery — approved photos only, each with source and usage right (SC-16 #3, FR-003) */}
      {location.images.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px dashed #d1d5db', color: '#6b7280' }}>
          {t('detail.no_photos')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {location.images.map(image => (
            <LocationPhoto key={image.image_url} image={image} alt={t('detail.photo.alt', { name: location.name_en })} />
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Logistics (SC-16 #8) */}
        <FactBlock
          title={t('detail.logistics.title')}
          noData={NO_DATA}
          facts={[
            [t('detail.logistics.crew'), L.crew(location.logistics.crew_capacity)],
            [t('detail.logistics.airport'), location.airport_km === null ? NO_DATA : t('detail.km', { km: location.airport_km })],
            [t('detail.logistics.lodging'), L.yesNo(location.logistics.lodging_20km)],
            [t('detail.logistics.power'), L.yesNo(location.logistics.grid_power)],
            [t('detail.logistics.truck'), L.yesNo(location.logistics.truck_access)]
          ]}
        />

        {/* Seasons and permits (SC-16 #9) */}
        <FactBlock
          title={t('detail.season.title')}
          noData={NO_DATA}
          facts={[
            [t('detail.season.avoid'), monthsToAvoidLabel(location.season.months_to_avoid, locale)],
            [t('detail.season.rainy'), rainyMonthsLabel(location.season.rainy_months, locale)],
            [t('detail.season.night'), nightShootingLabel(location.season.night_shooting_allowed, locale)],
            [t('detail.season.permit'), L.permit(location.permit_complexity)],
            [t('detail.season.restriction'), location.restriction_note || NO_DATA]
          ]}
        />

        {/* Local authority contact (SC-16 #10) */}
        {contactDenied ? (
          <section style={{ border: '1px dashed #d1d5db', borderRadius: '0.5rem', padding: '1.25rem', backgroundColor: '#f9fafb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: '0 0 0.5rem' }}>{t('location.contact.title')}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{t('location.contact.denied')}</p>
            <a href={loginHref} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>{t('location.contact.login')}</a>
          </section>
        ) : canSeeAuthorityContact(session) && !contact ? (
          // Published, but staff changed the contact and it awaits verification again (decision D4)
          <section style={{ border: '1px dashed #f59e0b', borderRadius: '0.5rem', padding: '1.25rem', backgroundColor: '#fffbeb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: '0 0 0.5rem' }}>{t('location.contact.title')}</h2>
            <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0 }}>{t('detail.contact.pending')}</p>
          </section>
        ) : canSeeAuthorityContact(session) ? (
          <FactBlock
            title={t('location.contact.title')}
            noData={NO_DATA}
            facts={[
              [t('detail.contact.authority'), contact?.authority_name || NO_DATA],
              [t('detail.contact.person'), contact?.contact_name || NO_DATA],
              [t('detail.contact.phone'), contact?.contact_phone || NO_DATA],
              [t('detail.contact.verified_on'), L.date(contact?.verified_at)]
            ]}
          />
        ) : (
          <section style={{ border: '1px dashed #d1d5db', borderRadius: '0.5rem', padding: '1.25rem', backgroundColor: '#f9fafb', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: '0 0 0.5rem' }}>{t('location.contact.title')}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' }}>
              {t('location.contact.members_only')}
            </p>
            <a
              href={loginHref}
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
              {t('location.contact.login')}
            </a>
            <a href={`/signup?next=${encodeURIComponent(`/locations/${location.slug}`)}`} style={{ display: 'block', marginTop: '0.75rem', color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
              {t('location.contact.signup')}
            </a>
          </section>
        )}
      </div>

      {/* Mini map + nearby published locations within 30 km (SC-16 #12, F-M3-14) */}
      <section style={{ marginTop: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem', backgroundColor: '#ffffff' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: '0 0 0.75rem' }}>{t('detail.nearby.title')}</h2>
        <LocationMap center={location.coordinates} name={location.name_en} label={t('detail.map', { name: location.name_en })} nearby={location.nearby_locations} />
        {location.nearby_locations.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.75rem 0 0' }}>
            {t('detail.nearby.none')}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0', fontSize: '0.875rem' }}>
            {location.nearby_locations.map(place => (
              <li key={place.slug} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.5rem 0', borderTop: '1px solid #f3f4f6' }}>
                <a href={`/locations/${place.slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                  {place.name_vi} <span style={{ color: '#6b7280' }}>({place.name_en})</span>
                </a>
                <span style={{ color: '#374151', whiteSpace: 'nowrap' }}>{t('detail.km', { km: place.distance_km.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB') })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
