'use client';

import React, { useState } from 'react';
import { serializeFilterState } from '../use-filter-state.js';

export default function SceneMatchPage() {
  const [description, setDescription] = useState(
    'A ferry landing at dawn between limestone karsts, 1970s, a waterside village, about 30 extras, night scenes too'
  );
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [shootMonth, setShootMonth] = useState(9);

  const handleAnalyze = async () => {
    if (!description || description.trim().length < 10) {
      setError('Scene description must be at least 10 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/locations/extract-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to extract scene attributes.');
      }

      const data = await res.json();
      setExtractedData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!extractedData || !extractedData.attributes) return;

    const queryParams = serializeFilterState({
      scene_types: extractedData.attributes.scene_types || [],
      crew_size: extractedData.attributes.crowd_scale || null,
      shoot_month: shootMonth || null
    });

    window.location.href = `/locations${queryParams}`;
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
          SC-15: Describe a Scene (AI Matching)
        </h1>
        <p style={{ color: '#4b5563', marginTop: '0.25rem' }}>
          Describe your scene in English or Vietnamese. The system extracts structured criteria and matches locations deterministically.
        </p>
      </header>

      {/* Description Input */}
      <section style={{ marginBottom: '2rem' }}>
        <label htmlFor="scene-desc" style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
          Scene Description (10–1000 characters)
        </label>
        <textarea
          id="scene-desc"
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            fontSize: '1rem',
            boxSizing: 'border-box'
          }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe geography, era, time of day, water features, crowd size..."
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
          <span>Length: {description.length} chars (minimum 10)</span>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || description.length < 10}
            style={{
              backgroundColor: loading || description.length < 10 ? '#9ca3af' : '#2563eb',
              color: '#ffffff',
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: loading || description.length < 10 ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {loading ? 'Analyzing...' : 'Analyse description'}
          </button>
        </div>
      </section>

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* What the System Understood */}
      {extractedData && (
        <section style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
            What the system understood
          </h2>

          {/* Mapped synonyms warning */}
          {extractedData.mapped_synonyms && extractedData.mapped_synonyms.length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '0.375rem', color: '#92400e', fontSize: '0.875rem' }}>
              <strong>Synonym Mapping:</strong>{' '}
              {extractedData.mapped_synonyms.map((m, i) => (
                <span key={i}>
                  &ldquo;{m.original}&rdquo; was mapped to official catalog value &ldquo;{m.mapped}&rdquo;
                  {i < extractedData.mapped_synonyms.length - 1 ? '; ' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Extracted attribute chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {extractedData.attributes.scene_types?.map((type) => (
              <span
                key={type}
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Scene: {type}
              </span>
            ))}
            {extractedData.attributes.era && (
              <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem' }}>
                Era: {extractedData.attributes.era}
              </span>
            )}
            {extractedData.attributes.crowd_scale && (
              <span style={{ backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem' }}>
                Crew: {extractedData.attributes.crowd_scale}
              </span>
            )}
          </div>

          {/* Planned shoot month */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="shoot-month" style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Planned Shooting Month
            </label>
            <select
              id="shoot-month"
              value={shootMonth}
              onChange={(e) => setShootMonth(parseInt(e.target.value, 10))}
              style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>Month {m}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSearch}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            Find matching locations (SC-14)
          </button>
        </section>
      )}
    </div>
  );
}
