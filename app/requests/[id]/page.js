import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth/session.js';
import { getI18n } from '../../../lib/i18n/server.js';
import { getRequest } from '../../../lib/db/collab.js';
import { isUuidLike } from '../../../lib/api/partners.js';
import RequestClient from './request-client.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('requests.meta.title')} · CINEMATCH` };
}

/** SC-25 Collaboration request + status tracking (/requests/[id]), M4 FR-013..FR-017: the project's members and the partner. */
export default async function RequestPage({ params }) {
  if (!isUuidLike(params.id)) notFound();
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect(`/login?next=${encodeURIComponent(`/requests/${params.id}`)}`);
  const request = await getRequest(session, params.id).catch((e) => (e?.code === 'NOT_FOUND' ? null : Promise.reject(e)));
  if (!request) notFound();
  return <RequestClient initial={request} viewer={session.role === 'partner' ? 'partner' : 'producer'} />;
}
