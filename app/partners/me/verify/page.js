import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '../../../../lib/auth/session.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import { getMyOrganisation } from '../../../../lib/db/partners.js';
import { listMyVerification } from '../../../../lib/db/verification.js';
import VerifyForm from './verify-form.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('verification.meta.title')} · CINEMATCH` };
}

/** SC-22 Submit verification (/partners/me/verify), M4 FR-008, BR-004: the PDF goes straight to the private bucket (R10). */
export default async function VerifyPage() {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect('/login?next=%2Fpartners%2Fme%2Fverify');
  const { t } = await getI18n();
  const mine = session.role === 'partner' ? await getMyOrganisation(session).catch(() => null) : null;
  if (!mine) return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p role="alert">{t('org.not_partner')}</p></main>;
  const history = await listMyVerification(session).catch(() => ({ current: null, history: [] }));
  return <VerifyForm org={JSON.parse(JSON.stringify(mine.organisation))} initial={JSON.parse(JSON.stringify(history))} />;
}
