// Shared look of the SYS auth screens (SC-04, SC-06, SC-07), close to the mockups in docs/screens/img/.
export const C = {
  navy: '#0f2d52', blue: '#2563eb', text: '#111827', muted: '#6b7280', border: '#d1d5db',
  soft: '#f3f4f6', panel: '#f9fafb', red: '#b91c1c', redSoft: '#fde8e8', green: '#15803d'
};

export const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1.5rem' };
export const panel = { background: C.panel, border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1.25rem' };
export const label = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: C.text, marginBottom: '0.375rem' };
export const input = {
  width: '100%', boxSizing: 'border-box', padding: '0.625rem 0.75rem', fontSize: '1rem',
  border: `1px solid ${C.border}`, borderRadius: '0.5rem', background: '#fff', color: C.text
};
export const fieldError = { color: C.red, fontSize: '0.8125rem', marginTop: '0.25rem' };
export const help = { color: C.muted, fontSize: '0.8125rem', marginTop: '0.25rem' };
export const link = { color: C.blue, textDecoration: 'none' };

export function button(disabled, variant = 'primary') {
  const primary = variant === 'primary';
  return {
    width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: 600, borderRadius: '0.5rem',
    border: primary ? 'none' : `1px solid ${C.navy}`,
    background: primary ? (disabled ? '#94a3b8' : C.navy) : '#fff',
    color: primary ? '#fff' : C.navy,
    cursor: disabled ? 'not-allowed' : 'pointer'
  };
}

// Two-column field pairs that stack on narrow screens (SC-04 §8, minimum width 360px)
export const pair = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '1rem' };
