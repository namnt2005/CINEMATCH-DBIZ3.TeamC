'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useT } from '../../../lib/i18n/client.js';

const PHOTO_BOX = { display: 'block', width: '100%', aspectRatio: '4 / 3', backgroundColor: '#e5e7eb' };

/**
 * One approved photo with its source and usage right (SC-16 #3, FR-003).
 * When the file cannot be loaded, a grey placeholder is shown instead; the caption stays.
 */
export default function LocationPhoto({ image, alt }) {
  const imgRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const t = useT();

  // The server-rendered <img> may fail before React attaches onError
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <figure style={{ margin: 0, border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: '#ffffff' }}>
      {failed ? (
        <div style={{ ...PHOTO_BOX, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
          {t('detail.photo.missing')}
        </div>
      ) : (
        <img
          ref={imgRef}
          src={image.image_url}
          alt={alt}
          onError={() => setFailed(true)}
          style={{ ...PHOTO_BOX, objectFit: 'cover' }}
        />
      )}
      <figcaption style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#4b5563' }}>
        <div><strong>{t('detail.photo.source')}</strong> {image.image_source}</div>
        <div><strong>{t('detail.photo.usage')}</strong> {image.usage_right}</div>
      </figcaption>
    </figure>
  );
}
