'use client';

import React, { useState, useEffect } from 'react';
import { deserializeFilterState, serializeFilterState } from './use-filter-state.js';
import { cardNameStyle } from './card-styles.js';

export default function LocationsSearchPage() {
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
        throw new Error('Failed to fetch matching locations');
      }
      const data = await res.json();
      setLocations(data.results || []);
    } catch (err) {
      setError(err.message);
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
            SC-14: Location Suggestions & Matching
          </h1>
          <p style={{ color: '#4b5563', marginTop: '0.25rem' }}>
            Ranked published locations scoring 40 or higher with explainable match reasons.
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
          ✏️ Edit Description (SC-15)
        </a>
      </header>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
        <input
          type="text"
          placeholder="Search by name or keyword (diacritic-insensitive)..."
          value={filters.q || ''}
          onChange={(e) => handleFilterChange('q', e.target.value)}
          style={{ flex: '1', minWidth: '240px', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        />
        <select
          value={filters.crew_size || ''}
          onChange={(e) => handleFilterChange('crew_size', e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        >
          <option value="">All crew sizes</option>
          <option value="u15">Under 15 crew</option>
          <option value="15_50">15–50 crew</option>
          <option value="o50">Over 50 crew</option>
        </select>
        <select
          value={filters.shoot_month || ''}
          onChange={(e) => handleFilterChange('shoot_month', e.target.value ? parseInt(e.target.value, 10) : null)}
          style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        >
          <option value="">Any month</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
            <option key={m} value={m}>Month {m}</option>
          ))}
        </select>
      </div>

      {/* Results Section */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          Loading matching locations...
        </div>
      ) : error ? (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.375rem' }}>
          {error}
        </div>
      ) : locations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
            No locations reach the 40-point threshold
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Try broadening your scene attributes or request assistance from VFDA scouts.
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
            Ask VFDA for suggestions
          </a>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1rem', fontWeight: '600', color: '#4b5563' }}>
            Showing {locations.length} published locations scoring ≥ 40
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
                      {loc.score}% Match
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
                      {loc.availability?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Why it matches (SC-002, BR-002) */}
                  <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Why it matches:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#14532d' }}>
                      {loc.match_reasons?.map((reason, rIdx) => (
                        <li key={rIdx}>{reason}</li>
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
                    View Details & Photos →
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
