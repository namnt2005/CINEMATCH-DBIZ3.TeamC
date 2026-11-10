import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../lib/auth/session.js';
import { listNotifications } from '../../lib/db/notifications.js';
import NotificationCentre from './notification-centre.js';

export const dynamic = 'force-dynamic';

/** SC-09 Notification centre (/notifications, ?filter=unread): signed-in users only (FR-009). */
export default async function NotificationsPage({ searchParams }) {
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect('/login?next=%2Fnotifications');
  const unreadOnly = searchParams?.filter === 'unread';
  let initial = null;
  try {
    initial = await listNotifications(session.userId, { unreadOnly });
  } catch {
    initial = null; // the screen shows its error state with Retry
  }
  return <NotificationCentre initial={initial} unreadOnly={unreadOnly} />;
}
