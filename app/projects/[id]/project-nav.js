// Project sidebar of SC-12, SC-13, SC-25, SC-32 and the M2 screens (#2): Overview, Content check, Partners, Provinces, Settings.
export default function ProjectNav({ t, projectId, current }) {
  const item = (href, key, name) => (
    <li><a href={href} aria-current={current === name ? 'page' : undefined}
      style={{ display: 'block', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', textDecoration: 'none', color: '#0f2d52', background: current === name ? '#e8eef7' : 'transparent', fontWeight: current === name ? 700 : 400 }}>{t(key)}</a></li>
  );
  return (
    <nav aria-label={t('dashboard.nav')}>
      <a href="/projects" style={{ display: 'block', margin: '0 0 0.75rem', color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>{t('dashboard.nav.back')}</a>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {item(`/projects/${projectId}`, 'dashboard.nav.overview', 'overview')}
        {item(`/projects/${projectId}/content`, 'dashboard.nav.content', 'content')}
        {item(`/projects/${projectId}/dossier`, 'dashboard.nav.dossier', 'dossier')}
        {item(`/projects/${projectId}/timeline`, 'dashboard.nav.timeline', 'timeline')}
        {item(`/requests?project=${projectId}`, 'dashboard.nav.partners', 'partners')}
        {item(`/projects/${projectId}/provinces`, 'notices.nav', 'provinces')}
        {item(`/projects/${projectId}/settings`, 'dashboard.nav.settings', 'settings')}
      </ul>
    </nav>
  );
}
