'use client';

import React, { useState, useEffect } from 'react';
import { deserializeFilterState, serializeFilterState } from './use-filter-state.js';
import { cardNameStyle } from './card-styles.js';
import { useT } from '../../lib/i18n/client.js';
import { availabilityText, reasonText } from './labels.js';

export default function LocationsSearchPage() {
  const t = useT();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    q: '',
    scene_types: [],
    crew_size: '',
    shoot_month: null
  });

  // Load filters from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialFilters = deserializeFilterState(window.location.search);
      setFilters(initialFilters);
      fetchLocations(initialFilters);
    }
  }, []);

  const fetchLocations = async (activeFilters) => {
    setLoading(true);
    setError(null);
    try {
      const qs = serializeFilterState(activeFilters);
      const res = await fetch(`/api/locations/search${qs}`);
      if (!res.ok) {
        throw new Error('search.error');
      }
      const data = await res.json();
      setLocations(data.results || []);
    } catch {
      setError('search.error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    if (typeof window !== 'undefined') {
      const qs = serializeFilterState(updated);
      window.history.replaceState({}, '', `/locations${qs}`);
    }
    fetchLocations(updated);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
            {t('search.title')}
          </h1>
          <p style={{ color: '#4b5563', marginTop: '0.25rem' }}>
            {t('search.lead')}
          </p>
        </div>
        <a
          href="/locations/match"
          style={{
            backgroundColor: '#f3f4f6',
            color: '#374151',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontWeight: '500',
            border: '1px solid #d1d5db'
          }}
        >
          ✏️ {t('search.edit_description')}
        </a>
      </header>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
        <input
          type="text"
          placeholder={t('search.placeholder')}
          aria-label={t('search.placeholder')}
          value={filters.q || ''}
          onChange={(e) => handleFilterChange('q', e.target.value)}
          style={{ flex: '1', minWidth: '240px', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        />
        <select
          value={filters.crew_size || ''}
          onChange={(e) => handleFilterChange('crew_size', e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        >
          <option value="">{t('search.crew_any')}</option>
          <option value="u15">{t('crew.u15')}</option>
          <option value="15_50">{t('crew.15_50')}</option>
          <option value="o50">{t('crew.o50')}</option>
        </select>
        <select
          value={filters.shoot_month || ''}
          onChange={(e) => handleFilterChange('shoot_month', e.target.value ? parseInt(e.target.value, 10) : null)}
          style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        >
          <option value="">{t('month.any')}</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
            <option key={m} value={m}>{t('month.n', { month: m })}</option>
          ))}
        </select>
      </div>

      {/* Results Section */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          {t('search.loading')}
        </div>
      ) : error ? (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.375rem' }}>
          {t(error)}
        </div>
      ) : locations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
            {t('search.empty.title')}
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            {t('search.empty.text')}
          </p>
          <a
            href="mailto:scouting@vfda.vn"
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            {t('search.empty.ask')}
          </a>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1rem', fontWeight: '600', color: '#4b5563' }}>
            {t('search.showing', { count: locations.length })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {locations.map((loc, idx) => (
              <div
                key={loc.location_id || idx}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {/* minWidth 0 lets the name shrink so the clamp applies instead of pushing the score badge */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 title={loc.name_en} style={{ ...cardNameStyle, fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                        {loc.name_en}
                      </h3>
                      <div title={loc.name_vi} style={{ ...cardNameStyle, fontSize: '0.875rem', color: '#6b7280' }}>
                        {loc.name_vi}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {loc.province_name}
                      </div>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        backgroundColor: loc.score >= 70 ? '#dcfce7' : '#fef9c3',
                        color: loc.score >= 70 ? '#166534' : '#854d0e',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontWeight: '700',
                        fontSize: '0.875rem'
                      }}
                    >
                      {t('search.score', { score: loc.score })}
                    </span>
                  </div>

                  {/* Availability badge */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem',
                        backgroundColor: loc.availability === 'open' ? '#e0f2fe' : '#fef3c7',
                        color: loc.availability === 'open' ? '#0369a1' : '#92400e',
                        textTransform: 'uppercase',
                        fontWeight: '600'
                      }}
                    >
                      {availabilityText(t, loc.availability)}
                    </span>
                  </div>

                  {/* Why it matches (SC-002, BR-002) */}
                  <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      {t('search.why')}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#14532d' }}>
                      {(loc.match_reason_codes || []).map((code, rIdx) => (
                        <li key={rIdx}>{reasonText(t, code)}</li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={`/locations/${loc.slug}`}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      backgroundColor: '#f3f4f6',
                      color: '#1f2937',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      textDecoration: 'none',
                      fontWeight: '500',
                      fontSize: '0.875rem'
                    }}
                  >
                    {t('search.details')} →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
