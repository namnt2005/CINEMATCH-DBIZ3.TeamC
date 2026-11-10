// Pre-check rate limit (M2 FR-005, edge case; decision D7): a sliding 24-hour window per key, kept in server memory.
// Known limitation 2: every server instance counts on its own and counts are lost on restart. No IP is stored anywhere.
export const WINDOW_MS = 24 * 3600 * 1000;
export const GUEST_LIMIT = 10;
export const MEMBER_LIMIT = 50;
const hits = new Map();

/** Counts one attempt for `key`; returns { ok, remaining }. */
export function takeCheck(key, limit, now = Date.now()) {
  const list = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  if (list.length >= limit) { hits.set(key, list); return { ok: false, remaining: 0 }; }
  list.push(now);
  hits.set(key, list);
  return { ok: true, remaining: limit - list.length };
}

/** Tests only. */
export function resetRateLimits() { hits.clear(); }
