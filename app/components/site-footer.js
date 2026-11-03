'use client';
// Site footer on every page: privacy policy (SC-42) and terms of use (SC-43).
import { usePathname } from 'next/navigation';
import { useT } from '../../lib/i18n/client.js';
import { footerTextKey } from '../landing-content.js';

export default function SiteFooter() {
  const t = useT();
  // Clarifications Q3: the landing page does not name VFDA, not even in the footer
  const pathname = usePathname() || '/';
  const link = { color: '#6b7280', textDecoration: 'none' };
  return (
    <footer style={{ borderTop: '1px solid #e5e7eb', marginTop: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem 1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: '#6b7280', fontSize: '0.875rem' }}>
        <span>{t(footerTextKey(pathname))}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem' }}>
          <a href="/privacy" style={link}>{t('frame.privacy')}</a>
          <a href="/terms" style={link}>{t('frame.terms')}</a>
        </span>
      </div>
    </footer>
  );
}
