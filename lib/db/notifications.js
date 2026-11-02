// Notifications (FR-007..FR-009, SC-09), node:sqlite or Supabase (specs/003-sys-core D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/notifications.js';

const supabase = () => import('./supabase/notifications.js');

export { PAGE_SIZE, readTarget } from './notification-shape.js';

export async function notify(...args) {
  return isSupabase() ? (await supabase()).notify(...args) : sqlite.notify(...args);
}
export async function listNotifications(...args) {
  return isSupabase() ? (await supabase()).listNotifications(...args) : sqlite.listNotifications(...args);
}
export async function unreadCount(...args) {
  return isSupabase() ? (await supabase()).unreadCount(...args) : sqlite.unreadCount(...args);
}
export async function markRead(...args) {
  return isSupabase() ? (await supabase()).markRead(...args) : sqlite.markRead(...args);
}
