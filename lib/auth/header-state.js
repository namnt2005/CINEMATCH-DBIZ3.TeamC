// What the site header needs about the visitor (T055): signed in or not, display name, role, unread count.
import { getSession } from './session.js';
import { getProfileName } from '../db/profiles.js';
import { unreadCount } from '../db/notifications.js';

export async function headerState() {
  const { headers } = await import('next/headers.js');
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated) return { signedIn: false, name: null, role: 'guest', unread: 0 };
  let name = null;
  let unread = 0;
  if (session.userId) {
    // The header must never break a page: a failed read shows no name and no badge
    name = await getProfileName(session.userId).catch(() => null);
    unread = await unreadCount(session.userId).catch(() => 0);
  }
  return { signedIn: true, name, role: session.role, unread };
}
