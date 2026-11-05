'use client';
// Opens the browser's print dialog (Save as PDF) once the letter is shown, and again on demand (M7 D4).
import { useEffect } from 'react';

export default function PrintButton({ label }) {
  useEffect(() => { const id = setTimeout(() => window.print(), 300); return () => clearTimeout(id); }, []);
  return <button type="button" onClick={() => window.print()} style={{ background: '#0f2d52', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', font: 'inherit', cursor: 'pointer' }}>{label}</button>;
}
