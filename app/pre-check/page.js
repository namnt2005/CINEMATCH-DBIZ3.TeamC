import { precheckBasis } from '../../lib/db/precheck.js';
import { getI18n } from '../../lib/i18n/server.js';
import PrecheckForm from './precheck-form.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('precheck.meta.title')} · CINEMATCH` };
}

/** SC-03 Script content input (/pre-check), M2 FR-005..FR-007: no sign-up needed (SR-061). */
export default async function PrecheckPage() {
  const basis = await precheckBasis().catch(() => ({ rule_version: null, approved_count: 0, advanced_available: false }));
  return <PrecheckForm basis={basis} />;
}
