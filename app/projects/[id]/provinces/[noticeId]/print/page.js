import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../../../../../lib/auth/session.js';
import { getApprovedLetter } from '../../../../../../lib/db/notices.js';
import { getI18n } from '../../../../../../lib/i18n/server.js';
import PrintButton from './print-button.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('notices.print.title')} · CINEMATCH` };
}

/**
 * The approved letter for *Save as PDF* (M7 D4, BR-002). Read-only: opening it records nothing (analysis U2);
 * the SC-32 button records the download before it opens this page. Not approved, or not a member → 404.
 */
export default async function PrintNoticePage({ params, searchParams }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/projects/${params.id}/provinces`)}`);
  const recipient = searchParams?.recipient || 'peoples_committee';
  const result = await getApprovedLetter(session, params.noticeId, { recipient }).catch(() => null);
  if (!result) notFound();
  const { t } = await getI18n();
  return (
    <main style={{ maxWidth: '760px', margin: '2rem auto', padding: '0 1.5rem', fontFamily: '"Times New Roman", serif', fontSize: '13pt', lineHeight: 1.5 }}>
      <style media="print">{'header,footer,nav,.no-print{display:none!important}main{margin:0 auto!important}@page{size:A4;margin:2cm}'}</style>
      <div className="no-print" style={{ marginBottom: '1.5rem' }}><PrintButton label={t('notices.print.button')} /></div>
      {result.letter.paragraphs.map((p, i) => (
        <p key={i} lang={p.lang} style={{ margin: '0 0 0.75rem', marginTop: i > 0 && p.lang !== result.letter.paragraphs[i - 1].lang ? '2rem' : undefined }}>{p.text}</p>
      ))}
    </main>
  );
}
