'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * Leaflet + OpenStreetMap mini map for SC-16 #12 (T037).
 * Leaflet needs `window`, so it is loaded in the browser only.
 * Circle markers avoid Leaflet's default icon images, which bundlers do not resolve.
 *
 * @param {{ center: { lat: number, lng: number }, name: string,
 *           nearby?: { slug: string, name_en: string, coordinates: { lat: number, lng: number }, distance_km: number }[] }} props
 */
export default function LocationMap({ center, name, nearby = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let map = null;
    let cancelled = false;

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([center.lat, center.lng], 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      L.circleMarker([center.lat, center.lng], { radius: 9, color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 0.9 })
        .addTo(map)
        .bindTooltip(name);

      for (const place of nearby) {
        L.circleMarker([place.coordinates.lat, place.coordinates.lng], { radius: 7, color: '#4b5563', fillColor: '#9ca3af', fillOpacity: 0.9 })
          .addTo(map)
          .bindTooltip(`${place.name_en} · ${place.distance_km} km`);
      }

      if (nearby.length > 0) {
        const points = [[center.lat, center.lng], ...nearby.map(p => [p.coordinates.lat, p.coordinates.lng])];
        map.fitBounds(points, { padding: [32, 32], maxZoom: 13 });
      }
    });

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [center.lat, center.lng, name, nearby]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Map of ${name}`}
      style={{ height: '320px', width: '100%', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6' }}
    />
  );
}
