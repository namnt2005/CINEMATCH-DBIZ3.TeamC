import { getI18n } from '../../lib/i18n/server.js';
import { listRequirements } from '../../lib/db/requirements.js';
import LibraryClient from './library-client.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('requirements.meta.title')} · CINEMATCH` };
}

/** SC-30 Requirements library (/requirements), M2 FR-015: approved rules in force, by topic and segment; no account needed (SR-285). */
export default async function RequirementsPage({ searchParams }) {
  const pick = (k) => (typeof searchParams?.[k] === 'string' ? searchParams[k] : null);
  const filters = { topic: pick('topic'), segment: pick('segment') };
  let shown = filters;
  let data = await listRequirements(filters).catch((err) => (err?.code === 'VALIDATION_ERROR' ? undefined : null));
  if (data === undefined) {                                    // an unknown filter in the URL: show everything
    shown = { topic: null, segment: null };
    data = await listRequirements(shown).catch(() => null);
  }
  return <LibraryClient data={data} filters={shown} />;
}
