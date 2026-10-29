'use client';

import React, { useState } from 'react';
import {
  DEFAULT_SHOOT_MONTH,
  monthOptions,
  monthFromExtraction,
  monthFromSelect,
  searchQuery,
  extractionChips,
  extractorLabel
} from './match-view.js';

const CHIP_COLORS = {
  scene: { backgroundColor: '#dbeafe', color: '#1e40af' },
  era: { backgroundColor: '#e0e7ff', color: '#3730a3' },
  crew: { backgroundColor: '#f3e8ff', color: '#6b21a8' },
  time: { backgroundColor: '#fef3c7', color: '#92400e' }
};

export default function SceneMatchPage() {
  const [description, setDescription] = useState(
    'A ferry landing at dawn between limestone karsts, 1970s, a waterside village, about 30 extras, night scenes too'
  );
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [shootMonth, setShootMonth] = useState(DEFAULT_SHOOT_MONTH);

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
      // BR-003: a description without a month leaves the field empty, even after an earlier one had a month
      setShootMonth(monthFromExtraction(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!extractedData || !extractedData.attributes) return;

    window.location.href = `/locations${searchQuery(extractedData, shootMonth)}`;
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem', color: '#1f2937' }}>
            What the system understood
          </h2>
          {/* Which extractor answered, for testers (Gemini or rule-based) */}
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
            {extractorLabel(extractedData)}
          </div>

          {/* Gemini unavailable: the rule-based extractor answered (SC-15 error state) */}
          {extractedData.fallback && (
            <div role="status" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#e0f2fe', borderRadius: '0.375rem', color: '#075985', fontSize: '0.875rem' }}>
              <strong>Đang dùng chế độ dự phòng.</strong> Không gọi được mô hình ngôn ngữ nên hệ thống dùng bộ trích theo luật; hãy kiểm tra và sửa các tiêu chí bên dưới trước khi tìm.
            </div>
          )}

          {/* Values outside the catalogue were dropped (F-M3-12, SR-093) */}
          {extractedData.rejected && extractedData.rejected.length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '0.375rem', color: '#991b1b', fontSize: '0.875rem' }}>
              <strong>Not in the catalogue, dropped:</strong>{' '}
              {extractedData.rejected.map(v => `“${v}”`).join(', ')}
            </div>
          )}

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
            {extractionChips(extractedData).map(chip => (
              <span
                key={chip.key}
                style={{
                  ...CHIP_COLORS[chip.kind],
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: chip.kind === 'scene' ? '500' : 'normal'
                }}
              >
                {chip.label}
              </span>
            ))}
          </div>

          {/* Planned shoot month */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="shoot-month" style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Planned Shooting Month
            </label>
            <select
              id="shoot-month"
              value={shootMonth === null ? '' : String(shootMonth)}
              onChange={(e) => setShootMonth(monthFromSelect(e.target.value))}
              style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
            >
              {monthOptions().map(option => (
                <option key={option.value || 'any'} value={option.value}>{option.label}</option>
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
