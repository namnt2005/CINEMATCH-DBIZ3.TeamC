'use client';
// SC-09, in the order of docs/screens/screen-spec-SC-09.md: title and unread count (#2) → All / Unread (#3)
// → Mark all as read (#4) → rows (#5–#9) → Show older (#10); then the empty, error and success states.
// Rows are the user's own, newest first (SR-241, SR-242). The screens they point to (SC-25, SC-32, SC-33)
// are not built yet, so rows have no *Open* button for now.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../../lib/i18n/client.js';
import { formatDate, formatTime } from '../../lib/i18n/format.js';

const C = { blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534' };

/** Readable label of an event and the detail from its payload (FR-009, contracts/notifications.contract.md). */
export function eventText(t, { event_type: type, payload = {} }) {
  const label = t(`notification.event.${type}`);
  const title = label === `notification.event.${type}` ? t('notification.event.other') : label;
  const detail = payload.project || payload.org || payload.province
    || (payload.days_left ? t('notification.days_left', { days: payload.days_left }) : '');
  return { title, detail };
}

async function post(body) {
  const res = await fetch('/api/notifications/read', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('notification.error.mark');
  return res.json();
}

export default function NotificationCentre({ initial, unreadOnly }) {
  const t = useT();
  const router = useRouter();
  const [rows, setRows] = useState(initial?.notifications ?? []);
  const [unread, setUnread] = useState(initial?.unread_count ?? 0);
  const [hasMore, setHasMore] = useState(Boolean(initial?.has_more));
  const [failed, setFailed] = useState(initial === null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [notice, setNotice] = useState(null);

  async function markOne(id) {
    setRows(list => list.map(n => (n.notification_id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    try {
      const { unread_count } = await post({ ids: [id] });
      setUnread(unread_count);
      router.refresh(); // the header badge follows
    } catch {
      // Error state: the row returns to unread with a short message
      setRows(list => list.map(n => (n.notification_id === id ? { ...n, read_at: null } : n)));
      setNotice({ type: 'error', text: t('notification.error.mark') });
    }
  }

  async function markAll() {
    try {
      const { unread_count } = await post({ all: true });
      setRows(list => (unreadOnly ? [] : list.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))));
      setUnread(unread_count);
      setNotice({ type: 'success', text: t('notification.all_marked') });
      router.refresh();
    } catch {
      setNotice({ type: 'error', text: t('notification.error.mark') });
    }
  }

  async function loadOlder() {
    setLoadingOlder(true);
    const before = rows.at(-1)?.created_at;
    try {
      const res = await fetch(`/api/notifications?${new URLSearchParams({ unread_only: String(unreadOnly), before })}`);
      if (!res.ok) throw new Error('notification.error.load');
      const data = await res.json();
      setRows(list => [...list, ...data.notifications]);
      setHasMore(data.has_more);
    } catch {
      setNotice({ type: 'error', text: t('notification.error.load') });
    }
    setLoadingOlder(false);
  }

  const tab = (value, label) => (
    <a href={value ? '/notifications?filter=unread' : '/notifications'} aria-current={unreadOnly === Boolean(value) ? 'page' : undefined}
      style={{ padding: '0.375rem 0.875rem', borderRadius: '9999px', textDecoration: 'none', color: unreadOnly === Boolean(value) ? '#fff' : '#374151', background: unreadOnly === Boolean(value) ? '#111827' : '#f3f4f6' }}>
      {label}
    </a>
  );

  return (
    <main style={{ maxWidth: '880px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
          {t('notification.title')}
          {unread > 0 ? <span style={{ marginLeft: '0.5rem', fontSize: '1rem', background: C.red, color: '#fff', borderRadius: '9999px', padding: '0.125rem 0.6rem' }}>{t('notification.unread_count', { count: unread })}</span> : null}
        </h1>
        {unread > 0 ? <button type="button" onClick={markAll} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.5rem 0.875rem', cursor: 'pointer' }}>{t('notification.mark_all')}</button> : null}
      </div>
      <nav aria-label={t('notification.filter')} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        {tab(false, t('notification.tab.all'))}
        {tab(true, t('notification.tab.unread'))}
      </nav>

      {notice ? (
        <p role={notice.type === 'error' ? 'alert' : 'status'} style={{ background: notice.type === 'error' ? '#fde8e8' : '#dcfce7', color: notice.type === 'error' ? C.red : C.green, padding: '0.625rem 0.875rem', borderRadius: '0.5rem' }}>{notice.text}</p>
      ) : null}

      {failed ? (
        <div role="alert" style={{ border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.75rem' }}>{t('notification.error.load')}</p>
          <button type="button" onClick={() => router.refresh()} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>{t('notification.retry')}</button>
        </div>
      ) : rows.length === 0 ? (
        <p style={{ color: C.muted, border: `1px dashed ${C.border}`, borderRadius: '0.5rem', padding: '1.5rem', textAlign: 'center' }}>
          {unreadOnly ? t('notification.empty.unread') : t('notification.empty.all')}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: `1px solid ${C.border}`, borderRadius: '0.5rem', overflow: 'hidden' }}>
          {rows.map(n => {
            const { title, detail } = eventText(t, n);
            const isUnread = !n.read_at;
            return (
              <li key={n.notification_id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.875rem 1rem', borderTop: `1px solid ${C.border}`, background: isUnread ? '#eff6ff' : '#fff' }}>
                <span aria-hidden="true" style={{ width: '0.5rem', height: '0.5rem', marginTop: '0.45rem', borderRadius: '50%', background: isUnread ? C.blue : 'transparent', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: isUnread ? 700 : 400 }}>
                    {isUnread ? <span style={{ position: 'absolute', left: '-9999px' }}>{t('notification.unread')}</span> : null}
                    {title}
                  </div>
                  {detail ? <div style={{ color: '#374151', fontSize: '0.875rem' }}>{detail}</div> : null}
                  <div style={{ color: C.muted, fontSize: '0.8125rem' }}>{t('notification.when', { date: formatDate(n.created_at), time: formatTime(n.created_at) })}</div>
                </div>
                {isUnread ? <button type="button" onClick={() => markOne(n.notification_id)} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('notification.mark_one')}</button> : null}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && !failed ? (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button type="button" onClick={loadOlder} disabled={loadingOlder} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            {loadingOlder ? t('notification.loading') : t('notification.older')}
          </button>
        </div>
      ) : null}
    </main>
  );
}
