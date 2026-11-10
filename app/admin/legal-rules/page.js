import { headers } from 'next/headers';
import { getSession } from '../../../lib/auth/session.js';
import { getI18n } from '../../../lib/i18n/server.js';
import { listRules, listVersions } from '../../../lib/db/legal-rules.js';
import RulesClient from './rules-client.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('rules.meta.title')} · CINEMATCH` };
}

/** SC-37 Admin — Legal rule base (/admin/legal-rules), M2 FR-001..FR-004: vfda_legal writes and signs; admin reads (D9). */
export default async function LegalRulesPage() {
  const session = await getSession({ headers: headers() });
  const { t } = await getI18n();
  if (!['vfda_legal', 'admin'].includes(session.role)) {
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827' }}>{t('rules.only.title')}</h1>
        <p style={{ color: '#b91c1c' }}>{t('rules.only.text')}</p>
        <a href="/login?next=%2Fadmin%2Flegal-rules" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('admin.staff_only.login')}</a>
      </div>
    );
  }
  const [list, history] = await Promise.all([listRules(session, {}).catch(() => ({ rule_version: null, counts: {}, rules: [] })), listVersions(session).catch(() => ({ versions: [] }))]);
  return <RulesClient initial={JSON.parse(JSON.stringify(list))} history={history.versions} canWrite={session.role === 'vfda_legal'} />;
}
