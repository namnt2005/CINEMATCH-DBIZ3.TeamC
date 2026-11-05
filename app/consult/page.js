import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../lib/auth/session.js';
import { listConsultations } from '../../lib/db/consultations.js';
import { getI18n } from '../../lib/i18n/server.js';
import ConsultationForm from './consultation-form.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('consult.meta.title')} · CINEMATCH` };
}

/** SC-33 Consultation request (/consult), M7 FR-005 as reshaped by BR-005. Signed-in accounts only (SR-364). */
export default async function ConsultPage() {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect('/login?next=%2Fconsult');
  const { requests } = await listConsultations(session).catch(() => ({ requests: [] }));
  return <ConsultationForm initialRequests={requests} />;
}
